import os
import io
import pandas as pd
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    init_db,
    save_transactions,
    load_transactions_df,
    update_transaction_category,
    save_category_rule,
    load_category_rules,
    delete_category_rule,
    get_custom_categories,
    add_custom_category,
    delete_custom_category,
    delete_all_transactions
)
from parser import parse_gpay_pdf
from categorizer import get_all_categories, reapply_all_categories

# Initialize DB
init_db()

app = FastAPI(title="UPI Spending Analyser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas
class RulePayload(BaseModel):
    keyword: str
    category: str

class CategoryPayload(BaseModel):
    name: str

class CategoryUpdatePayload(BaseModel):
    txn_id: str
    category: str

@app.get("/api/status")
def get_status():
    df = load_transactions_df()
    return {
        "status": "online",
        "total_records": len(df),
        "db_ready": True
    }

@app.post("/api/upload")
async def upload_statements(files: List[UploadFile] = File(...)):
    total_added = 0
    total_duplicates = 0
    errors = []

    for file in files:
        try:
            content = await file.read()
            file_stream = io.BytesIO(content)
            txns = parse_gpay_pdf(file_stream)
            if txns:
                added, dupes = save_transactions(txns)
                total_added += added
                total_duplicates += dupes
            else:
                errors.append(f"No transactions detected in {file.filename}")
        except Exception as e:
            errors.append(f"Error reading {file.filename}: {str(e)}")

    return {
        "added": total_added,
        "duplicates": total_duplicates,
        "errors": errors,
        "success": total_added > 0 or total_duplicates > 0
    }

@app.get("/api/analytics")
def get_analytics(
    time_mode: str = Query("all", description="all | month | range | quick"),
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    quick_range: Optional[str] = Query(None),
    exclude_transfers: bool = Query(True),
    payment_method: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    df = load_transactions_df()
    if df.empty:
        return {
            "has_data": False,
            "available_months": [],
            "available_methods": [],
            "categories": get_all_categories()
        }

    # Format dates
    df['_dt'] = pd.to_datetime(df['txn_date'], errors='coerce')
    valid_dates = df['_dt'].dropna()
    min_date = valid_dates.min().strftime('%Y-%m-%d') if not valid_dates.empty else ""
    max_date = valid_dates.max().strftime('%Y-%m-%d') if not valid_dates.empty else ""

    # Available months for selector
    raw_months = sorted(list(df['statement_month'].dropna().unique()), reverse=True)
    available_months = []
    for m in raw_months:
        try:
            lbl = datetime.strptime(m, "%Y-%m").strftime("%B %Y")
        except:
            lbl = m
        available_months.append({"id": m, "label": lbl})

    available_methods = sorted(list(df['payment_method'].dropna().unique()))

    # Apply Time Filtering
    filtered = df.copy()
    filter_label = "All Time"

    if time_mode == "month" and month:
        filtered = filtered[filtered['statement_month'] == month]
        lbl = next((item['label'] for item in available_months if item['id'] == month), month)
        filter_label = lbl
    elif time_mode == "range" and start_date and end_date:
        filtered = filtered[(filtered['_dt'] >= start_date) & (filtered['_dt'] <= end_date)]
        filter_label = f"{start_date} to {end_date}"
    elif time_mode == "quick" and quick_range:
        last_dt = valid_dates.max()
        if quick_range == "30d":
            cutoff = last_dt - pd.Timedelta(days=30)
            filtered = filtered[filtered['_dt'] >= cutoff]
            filter_label = "Last 30 Days"
        elif quick_range == "60d":
            cutoff = last_dt - pd.Timedelta(days=60)
            filtered = filtered[filtered['_dt'] >= cutoff]
            filter_label = "Last 60 Days"
        elif quick_range == "90d":
            cutoff = last_dt - pd.Timedelta(days=90)
            filtered = filtered[filtered['_dt'] >= cutoff]
            filter_label = "Last 90 Days"
        elif quick_range == "year":
            cutoff = last_dt.replace(month=1, day=1)
            filtered = filtered[filtered['_dt'] >= cutoff]
            filter_label = f"Year {last_dt.year}"

    # Additional filter: payment method
    if payment_method and payment_method != "all":
        filtered = filtered[filtered['payment_method'] == payment_method]

    # Additional filter: category
    if category and category != "all":
        filtered = filtered[filtered['category'] == category]

    # Compute Expenses vs Inflow
    debits = filtered[filtered['txn_type'] == 'DEBIT']
    if exclude_transfers:
        expenses = debits[~debits['category'].isin(['Self Transfer', 'UPI Lite Top-up'])]
    else:
        expenses = debits

    credits = filtered[filtered['txn_type'] == 'CREDIT']
    total_spent = float(expenses['amount'].sum())
    total_received = float(credits['amount'].sum())
    net_spend = total_spent - total_received

    # RuPay vs Bank
    rupay_spend = float(expenses[expenses['payment_method'].str.contains('RuPay|Credit card', case=False, na=False)]['amount'].sum())
    bank_spend = total_spent - rupay_spend

    # 1. Category Breakdown
    cat_breakdown = []
    if not expenses.empty:
        cat_grp = expenses.groupby('category')['amount'].sum().reset_index().sort_values(by='amount', ascending=False)
        for _, r in cat_grp.iterrows():
            pct = round((r['amount'] / total_spent * 100), 1) if total_spent > 0 else 0
            cat_breakdown.append({
                "category": r['category'],
                "amount": round(float(r['amount']), 2),
                "percentage": pct
            })

    # 2. Payment Method Breakdown
    method_breakdown = []
    if not expenses.empty:
        m_grp = expenses.groupby('payment_method')['amount'].sum().reset_index().sort_values(by='amount', ascending=False)
        for _, r in m_grp.iterrows():
            pct = round((r['amount'] / total_spent * 100), 1) if total_spent > 0 else 0
            method_breakdown.append({
                "method": r['payment_method'],
                "amount": round(float(r['amount']), 2),
                "percentage": pct
            })

    # 3. Daily Spending Trend
    daily_trend = []
    if not expenses.empty:
        d_grp = expenses.groupby('txn_date')['amount'].sum().reset_index().sort_values(by='txn_date')
        for _, r in d_grp.iterrows():
            daily_trend.append({
                "date": r['txn_date'],
                "amount": round(float(r['amount']), 2)
            })

    # 4. Monthly Trend (Month-over-month)
    monthly_trend = []
    if not expenses.empty:
        mo_grp = expenses.groupby('statement_month')['amount'].sum().reset_index().sort_values(by='statement_month')
        for _, r in mo_grp.iterrows():
            m_code = r['statement_month']
            try:
                m_name = datetime.strptime(m_code, "%Y-%m").strftime("%b %Y")
            except:
                m_name = m_code
            monthly_trend.append({
                "month": m_code,
                "label": m_name,
                "amount": round(float(r['amount']), 2)
            })

    # 5. Top Payees
    top_payees = []
    if not expenses.empty:
        p_grp = expenses.groupby('party').agg(
            total_spent=('amount', 'sum'),
            tx_count=('amount', 'count'),
            categories=('category', lambda s: ", ".join(sorted(set(s.dropna()))))
        ).reset_index().sort_values(by='total_spent', ascending=False).head(15)

        for _, r in p_grp.iterrows():
            top_payees.append({
                "party": r['party'],
                "category": r['categories'],
                "total_spent": round(float(r['total_spent']), 2),
                "tx_count": int(r['tx_count']),
                "avg_per_txn": round(float(r['total_spent'] / r['tx_count']), 2) if r['tx_count'] > 0 else 0.0
            })

    return {
        "has_data": True,
        "filter_label": filter_label,
        "min_date": min_date,
        "max_date": max_date,
        "available_months": available_months,
        "available_methods": available_methods,
        "kpis": {
            "total_spent": round(total_spent, 2),
            "total_received": round(total_received, 2),
            "net_spend": round(net_spend, 2),
            "rupay_spend": round(rupay_spend, 2),
            "bank_spend": round(bank_spend, 2),
            "transaction_count": len(filtered)
        },
        "category_breakdown": cat_breakdown,
        "payment_method_breakdown": method_breakdown,
        "daily_trend": daily_trend,
        "monthly_trend": monthly_trend,
        "top_payees": top_payees
    }

@app.get("/api/transactions")
def get_transactions(
    search: Optional[str] = Query(None),
    time_mode: str = Query("all"),
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    limit: int = Query(500)
):
    df = load_transactions_df()
    if df.empty:
        return []

    # Time filter
    df['_dt'] = pd.to_datetime(df['txn_date'], errors='coerce')
    if time_mode == "month" and month:
        df = df[df['statement_month'] == month]
    elif time_mode == "range" and start_date and end_date:
        df = df[(df['_dt'] >= start_date) & (df['_dt'] <= end_date)]

    # Search filter
    if search:
        s = search.lower().strip()
        df = df[
            df['party'].str.lower().str.contains(s, na=False) |
            df['payment_method'].str.lower().str.contains(s, na=False) |
            df['txn_id'].str.lower().str.contains(s, na=False) |
            df['category'].str.lower().str.contains(s, na=False)
        ]

    if category and category != "all":
        df = df[df['category'] == category]

    if payment_method and payment_method != "all":
        df = df[df['payment_method'] == payment_method]

    df = df.drop(columns=['_dt'], errors='ignore')
    return df.head(limit).to_dict(orient="records")

@app.get("/api/categories")
def get_categories():
    return {
        "all_categories": get_all_categories(),
        "custom_categories": get_custom_categories()
    }

@app.post("/api/categories")
def create_category(payload: CategoryPayload):
    ok = add_custom_category(payload.name)
    if not ok:
        raise HTTPException(status_code=400, detail="Category already exists or invalid.")
    return {"success": True, "category": payload.name}

@app.delete("/api/categories/{name}")
def remove_category(name: str):
    delete_custom_category(name)
    reapply_all_categories()
    return {"success": True}

@app.get("/api/rules")
def get_rules():
    rules = load_category_rules()
    return [{"keyword": k, "category": v} for k, v in rules.items()]

@app.post("/api/rules")
def create_rule(payload: RulePayload):
    save_category_rule(payload.keyword, payload.category)
    return {"success": True}

@app.delete("/api/rules/{keyword}")
def remove_rule(keyword: str):
    delete_category_rule(keyword)
    reapply_all_categories()
    return {"success": True}

@app.post("/api/transactions/category")
def update_txn_cat(payload: CategoryUpdatePayload):
    update_transaction_category(payload.txn_id, payload.category)
    return {"success": True}

@app.post("/api/reset")
def reset_transactions():
    delete_all_transactions()
    return {"success": True}

# Serve frontend build if dist folder exists
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)

