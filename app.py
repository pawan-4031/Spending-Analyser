import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import io
import traceback
from datetime import datetime

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

# Page configuration
st.set_page_config(
    page_title="UPI Spending Analyser",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border-radius: 10px;
        padding: 15px 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-left: 5px solid #1E88E5;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #212529;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 12px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 16px;
        border-radius: 6px;
    }
</style>
""", unsafe_allow_html=True)

# Initialize database
init_db()

# --- SIDEBAR: Upload & Filters ---
with st.sidebar:
    st.title("💳 UPI Analyser")
    st.caption("Google Pay Statement Analyzer with Local Memory")
    
    st.markdown("---")
    st.subheader("📁 Import PDF Statement")
    uploaded_files = st.file_uploader(
        "Upload Google Pay statement(s)",
        type=["pdf"],
        accept_multiple_files=True,
        help="Upload your Google Pay PDF statement(s). Duplicate transactions are automatically ignored."
    )
    
    if uploaded_files:
        st.write(f"📄 Selected: **{len(uploaded_files)} file(s)**")
        if st.button("Process & Save Statement(s)", type="primary", use_container_width=True):
            total_added = 0
            total_duplicates = 0
            total_extracted = 0
            file_errors = []
            
            progress_bar = st.progress(0.0)
            status_text = st.empty()
            
            for idx, uploaded_file in enumerate(uploaded_files):
                status_text.text(f"Processing '{uploaded_file.name}'...")
                try:
                    uploaded_file.seek(0)
                    file_bytes = io.BytesIO(uploaded_file.read())
                    txns = parse_gpay_pdf(file_bytes)
                    total_extracted += len(txns)
                    
                    if txns:
                        inserted, duplicates = save_transactions(txns)
                        total_added += inserted
                        total_duplicates += duplicates
                    else:
                        file_errors.append(f"No transactions found in '{uploaded_file.name}'. Ensure it's a valid Google Pay statement.")
                except Exception as e:
                    file_errors.append(f"Error processing '{uploaded_file.name}': {str(e)}")
                    traceback.print_exc()
                    
                progress_bar.progress((idx + 1) / len(uploaded_files))
                
            progress_bar.empty()
            status_text.empty()
            
            if total_added > 0 or total_duplicates > 0:
                st.session_state["feedback"] = {
                    "type": "success",
                    "msg": f"🎉 Successfully imported **{total_added} new transactions**! ({total_duplicates} duplicates skipped)."
                }
            elif total_extracted == 0:
                st.session_state["feedback"] = {
                    "type": "error",
                    "msg": "❌ Could not extract any transactions from the uploaded file(s). " + (" ".join(file_errors) if file_errors else "")
                }
            st.rerun()

    st.markdown("---")
    st.subheader("🔍 Filters")

# Display any persistent session messages at top of main page
if "feedback" in st.session_state:
    fb = st.session_state.pop("feedback")
    if fb["type"] == "success":
        st.success(fb["msg"])
    elif fb["type"] == "error":
        st.error(fb["msg"])
    elif fb["type"] == "warning":
        st.warning(fb["msg"])

# Load data from database
df = load_transactions_df()

if df.empty:
    st.info("👋 Welcome! Upload your Google Pay transaction statement PDF in the sidebar on the left and click **'Process & Save Statement(s)'** to begin.")
    
    st.markdown("""
    ### 💡 What this app does:
    * 🔒 **100% Offline & Private:** Stored on your machine in `transactions.db`. No data leaves your PC.
    * 🧠 **Persistent Memory:** Upload statements month after month. Past transactions and your custom rules stay saved.
    * 🛡️ **Zero Duplicates:** Uploading overlapping statements will never duplicate transactions (deduplicated by UPI Transaction ID).
    * 📊 **Categorization:** Automatically splits spends into Food, Groceries, Shopping, Subscriptions, and P2P transfers.
    """)
    st.stop()

# --- SIDEBAR FILTERS (When data exists) ---
with st.sidebar:
    st.subheader("⏱️ Time Period")
    
    # Calculate dates
    valid_dates = pd.to_datetime(df['txn_date'], errors='coerce').dropna()
    min_date = valid_dates.min().date() if not valid_dates.empty else datetime.today().date()
    max_date = valid_dates.max().date() if not valid_dates.empty else datetime.today().date()
    
    time_mode = st.radio(
        "Filter By:",
        options=["🌐 Whole Dataset (All Time)", "📅 Select Month(s)", "📆 Custom Date Range", "⚡ Quick Range"],
        index=0
    )
    
    filtered_df = df.copy()
    filter_label = "All Time (Whole Dataset)"
    
    if time_mode == "🌐 Whole Dataset (All Time)":
        filter_label = f"All Time ({min_date.strftime('%d %b %Y')} – {max_date.strftime('%d %b %Y')})"
        
    elif time_mode == "📅 Select Month(s)":
        month_keys = sorted(list(df['statement_month'].dropna().unique()), reverse=True)
        month_display_map = {}
        for m in month_keys:
            try:
                month_display_map[m] = datetime.strptime(m, "%Y-%m").strftime("%B %Y")
            except Exception:
                month_display_map[m] = m
                
        month_selection_type = st.radio("Mode", ["Single Month", "Multiple Months"], horizontal=True)
        if month_selection_type == "Single Month":
            chosen_m = st.selectbox(
                "Select Month",
                options=month_keys,
                format_func=lambda x: month_display_map.get(x, x)
            )
            if chosen_m:
                filtered_df = filtered_df[filtered_df['statement_month'] == chosen_m]
                filter_label = f"{month_display_map.get(chosen_m, chosen_m)}"
        else:
            chosen_months = st.multiselect(
                "Select Months",
                options=month_keys,
                default=month_keys,
                format_func=lambda x: month_display_map.get(x, x)
            )
            if chosen_months:
                filtered_df = filtered_df[filtered_df['statement_month'].isin(chosen_months)]
                labels = [month_display_map.get(m, m) for m in chosen_months]
                filter_label = f"Months: {', '.join(labels)}"
            else:
                filtered_df = filtered_df.iloc[0:0]
                filter_label = "No month selected"
                
    elif time_mode == "📆 Custom Date Range":
        date_range = st.date_input(
            "Select Date Range",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date
        )
        if isinstance(date_range, tuple) and len(date_range) == 2:
            start_d, end_d = date_range
            filtered_df['_temp_date'] = pd.to_datetime(filtered_df['txn_date'], errors='coerce').dt.date
            filtered_df = filtered_df[(filtered_df['_temp_date'] >= start_d) & (filtered_df['_temp_date'] <= end_d)]
            filtered_df = filtered_df.drop(columns=['_temp_date'])
            filter_label = f"{start_d.strftime('%d %b %Y')} – {end_d.strftime('%d %b %Y')}"
            
    elif time_mode == "⚡ Quick Range":
        quick_opt = st.selectbox(
            "Select Quick Range",
            ["Last 30 Days", "Last 60 Days", "Last 90 Days", "Current Year"]
        )
        filtered_df['_temp_date'] = pd.to_datetime(filtered_df['txn_date'], errors='coerce').dt.date
        if quick_opt == "Last 30 Days":
            cutoff = max_date - pd.Timedelta(days=30)
            filtered_df = filtered_df[filtered_df['_temp_date'] >= cutoff]
            filter_label = f"Last 30 Days ({cutoff.strftime('%d %b')} – {max_date.strftime('%d %b %Y')})"
        elif quick_opt == "Last 60 Days":
            cutoff = max_date - pd.Timedelta(days=60)
            filtered_df = filtered_df[filtered_df['_temp_date'] >= cutoff]
            filter_label = f"Last 60 Days ({cutoff.strftime('%d %b')} – {max_date.strftime('%d %b %Y')})"
        elif quick_opt == "Last 90 Days":
            cutoff = max_date - pd.Timedelta(days=90)
            filtered_df = filtered_df[filtered_df['_temp_date'] >= cutoff]
            filter_label = f"Last 90 Days ({cutoff.strftime('%d %b')} – {max_date.strftime('%d %b %Y')})"
        elif quick_opt == "Current Year":
            cutoff = max_date.replace(month=1, day=1)
            filtered_df = filtered_df[filtered_df['_temp_date'] >= cutoff]
            filter_label = f"Year {max_date.year}"
        filtered_df = filtered_df.drop(columns=['_temp_date'])

    st.markdown("---")
    st.subheader("💳 Source & Category")
    
    # Payment Method Filter
    available_methods = sorted(list(df['payment_method'].dropna().unique()))
    selected_methods = st.multiselect(
        "Payment Source / Account",
        options=available_methods,
        default=available_methods
    )
    
    # Categories Filter
    available_categories = sorted(list(df['category'].dropna().unique()))
    selected_categories = st.multiselect(
        "Categories",
        options=available_categories,
        default=available_categories
    )
    
    # Exclude internal transfers toggle
    exclude_transfers = st.checkbox("Exclude Self-Transfers & UPI Lite Top-ups", value=True)

# Apply remaining filters
if selected_methods:
    filtered_df = filtered_df[filtered_df['payment_method'].isin(selected_methods)]
if selected_categories:
    filtered_df = filtered_df[filtered_df['category'].isin(selected_categories)]

# Separate actual spends from transfers & income
debits_df = filtered_df[filtered_df['txn_type'] == 'DEBIT']
if exclude_transfers:
    expense_df = debits_df[~debits_df['category'].isin(['Self Transfer', 'UPI Lite Top-up'])]
else:
    expense_df = debits_df

credits_df = filtered_df[filtered_df['txn_type'] == 'CREDIT']
total_spent = expense_df['amount'].sum()
total_received = credits_df['amount'].sum()
net_spend = total_spent - total_received

# RuPay Credit Card vs Bank spend
rupay_spend = expense_df[expense_df['payment_method'].str.contains('RuPay|Credit card', case=False, na=False)]['amount'].sum()
bank_spend = total_spent - rupay_spend

# --- MAIN DASHBOARD ---
st.title("📊 UPI Spending Insights")

# Active period banner
st.info(f"📆 **Analyzing:** **{filter_label}** — Showing **{len(filtered_df)}** transactions (Total debits: ₹{total_spent:,.2f})")

# KPI Summary Row
kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
with kpi1:
    st.metric(label="Total Outflow (Spends)", value=f"₹{total_spent:,.2f}")
with kpi2:
    st.metric(label="Total Inflow (Received)", value=f"₹{total_received:,.2f}")
with kpi3:
    st.metric(label="Net Spends", value=f"₹{net_spend:,.2f}", delta=f"-₹{total_spent:,.2f}" if total_spent > 0 else None)
with kpi4:
    st.metric(label="RuPay CC Spends", value=f"₹{rupay_spend:,.2f}", help="Total debited via RuPay Credit Cards")
with kpi5:
    st.metric(label="Bank / UPI Lite Spends", value=f"₹{bank_spend:,.2f}", help="Debited directly from Bank accounts or UPI Lite")

st.markdown("---")

# Main Content Tabs
tab_overview, tab_merchants, tab_transactions, tab_rules = st.tabs([
    "📈 Analytics & Charts",
    "🏢 Top Payees & Merchants",
    "📝 Transactions Explorer",
    "⚙️ Custom Rules & Settings"
])

# --- TAB 1: OVERVIEW & CHARTS ---
with tab_overview:
    col_chart1, col_chart2 = st.columns([1, 1])
    
    with col_chart1:
        st.subheader("🍩 Spending by Category")
        if not expense_df.empty:
            cat_summary = expense_df.groupby('category')['amount'].sum().reset_index()
            cat_summary = cat_summary.sort_values(by='amount', ascending=False)
            
            fig_cat = px.pie(
                cat_summary,
                names='category',
                values='amount',
                hole=0.45,
                color_discrete_sequence=px.colors.qualitative.Plotly
            )
            fig_cat.update_traces(textposition='inside', textinfo='percent+label')
            fig_cat.update_layout(showlegend=False, margin=dict(t=20, b=20, l=10, r=10), height=380)
            st.plotly_chart(fig_cat, use_container_width=True)
        else:
            st.info("No expense data found for selected filters.")
            
    with col_chart2:
        st.subheader("💳 Spends by Payment Source")
        if not expense_df.empty:
            mode_summary = expense_df.groupby('payment_method')['amount'].sum().reset_index()
            fig_mode = px.pie(
                mode_summary,
                names='payment_method',
                values='amount',
                hole=0.45,
                color_discrete_sequence=px.colors.qualitative.Pastel
            )
            fig_mode.update_traces(textposition='inside', textinfo='percent+label')
            fig_mode.update_layout(showlegend=False, margin=dict(t=20, b=20, l=10, r=10), height=380)
            st.plotly_chart(fig_mode, use_container_width=True)
        else:
            st.info("No data available.")

    st.subheader("📅 Daily Spending Trend")
    if not expense_df.empty:
        daily_trend = expense_df.groupby('txn_date')['amount'].sum().reset_index()
        daily_trend = daily_trend.sort_values('txn_date')
        
        fig_trend = px.bar(
            daily_trend,
            x='txn_date',
            y='amount',
            labels={'txn_date': 'Date', 'amount': 'Amount (₹)'},
            color_discrete_sequence=['#1E88E5']
        )
        fig_trend.update_layout(
            xaxis_title="Date",
            yaxis_title="Total Spent (₹)",
            margin=dict(t=20, b=20, l=10, r=10),
            height=300
        )
        st.plotly_chart(fig_trend, use_container_width=True)

    # Month-over-Month comparison (when viewing multiple months or whole dataset)
    if not expense_df.empty and expense_df['statement_month'].nunique() > 1:
        st.subheader("📊 Month-over-Month Spending Comparison")
        mom_df = expense_df.groupby('statement_month')['amount'].sum().reset_index()
        mom_df = mom_df.sort_values('statement_month')
        mom_df['month_label'] = mom_df['statement_month'].apply(
            lambda x: datetime.strptime(x, "%Y-%m").strftime("%B %Y") if x else x
        )
        fig_mom = px.bar(
            mom_df,
            x='month_label',
            y='amount',
            text='amount',
            labels={'month_label': 'Month', 'amount': 'Total Outflow (₹)'},
            color='amount',
            color_continuous_scale='Blues'
        )
        fig_mom.update_traces(texttemplate='₹%{text:,.0f}', textposition='outside')
        fig_mom.update_layout(
            xaxis_title="Statement Month",
            yaxis_title="Total Spent (₹)",
            margin=dict(t=20, b=20, l=10, r=10),
            height=320
        )
        st.plotly_chart(fig_mom, use_container_width=True)

# --- TAB 2: TOP MERCHANTS & PAYEES ---
with tab_merchants:
    st.subheader("🏆 Top 10 Payees by Amount")
    if not expense_df.empty:
        top_payees = expense_df.groupby('party').agg(
            total_spent=('amount', 'sum'),
            tx_count=('amount', 'count'),
            categories=('category', lambda s: ", ".join(sorted(set(s.dropna()))))
        ).reset_index()
        
        top_10 = top_payees.sort_values(by='total_spent', ascending=True).tail(10)
        
        fig_payees = px.bar(
            top_10,
            x='total_spent',
            y='party',
            orientation='h',
            text='total_spent',
            color='categories',
            labels={'total_spent': 'Total Spent (₹)', 'party': 'Payee / Merchant', 'categories': 'Category'},
            hover_data={'categories': True, 'total_spent': ':.2f', 'tx_count': True}
        )
        fig_payees.update_traces(texttemplate='₹%{text:,.0f}', textposition='outside')
        fig_payees.update_layout(height=450, margin=dict(t=20, b=20, l=10, r=20), legend_title_text='Category')
        st.plotly_chart(fig_payees, use_container_width=True)
        
        st.markdown("#### Detailed Breakdown of Top Payees")
        top_table = top_payees.sort_values(by='total_spent', ascending=False).head(20).copy()
        top_table['avg_per_txn'] = (top_table['total_spent'] / top_table['tx_count']).round(2)
        
        formatted_table = top_table.rename(columns={
            'party': 'Party / Payee',
            'categories': 'Category',
            'total_spent': 'Total Spent (₹)',
            'tx_count': 'Transactions',
            'avg_per_txn': 'Average per Txn (₹)'
        })
        formatted_table['Total Spent (₹)'] = formatted_table['Total Spent (₹)'].map('₹{:,.2f}'.format)
        formatted_table['Average per Txn (₹)'] = formatted_table['Average per Txn (₹)'].map('₹{:,.2f}'.format)
        
        st.dataframe(formatted_table, use_container_width=True, hide_index=True)
    else:
        st.info("No expense transactions to display.")

# --- TAB 3: TRANSACTIONS EXPLORER ---
with tab_transactions:
    st.subheader("📋 All Filtered Transactions")
    
    # Search bar
    search_query = st.text_input("🔍 Search transactions by Payee, Payment Method, or UPI ID", "")
    display_df = filtered_df.copy()
    if search_query:
        display_df = display_df[
            display_df['party'].str.contains(search_query, case=False, na=False) |
            display_df['payment_method'].str.contains(search_query, case=False, na=False) |
            display_df['txn_id'].str.contains(search_query, case=False, na=False)
        ]
        
    st.caption(f"Showing {len(display_df)} transactions")
    
    # Quick export button
    csv_data = display_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Export Filtered Data to CSV",
        data=csv_data,
        file_name=f"upi_transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        mime="text/csv"
    )
    
    # Render table
    show_cols = ['date_time', 'txn_type', 'party', 'amount', 'category', 'payment_method', 'txn_id']
    st.dataframe(
        display_df[show_cols].rename(columns={
            'date_time': 'Date & Time',
            'txn_type': 'Type',
            'party': 'Party / Payee',
            'amount': 'Amount (₹)',
            'category': 'Category',
            'payment_method': 'Paid Via',
            'txn_id': 'UPI Ref ID'
        }),
        use_container_width=True,
        hide_index=True
    )

# --- TAB 4: CATEGORY RULES & SETTINGS ---
with tab_rules:
    all_available_categories = get_all_categories()
    
    st.subheader("🏷️ Teach the Analyser (Custom Rules)")
    st.markdown("""
    Want to categorize a specific person or vendor? For instance, teach the analyser that:
    * `"MANISH WANGCHUK SHERPA"` $\\rightarrow$ `"Food & Dining"` or `"Rent"`
    * `"NIT SIKKIM"` $\\rightarrow$ `"Education & Fees"`
    
    Setting a rule updates **all past transactions** for that payee and applies automatically to **all future PDF uploads**!
    """)
    
    col_rule1, col_rule2, col_rule3 = st.columns([2, 2, 1])
    
    with col_rule1:
        parties_list = sorted(list(df['party'].dropna().unique()))
        selected_party = st.selectbox("Select Payee / Keyword", options=parties_list)
        custom_input = st.text_input("Or enter a custom text keyword (optional)", "")
        
    with col_rule2:
        target_keyword = custom_input.strip() if custom_input.strip() else selected_party
        selected_new_cat = st.selectbox("Assign to Category", options=all_available_categories)
        
    with col_rule3:
        st.write("")
        st.write("")
        if st.button("Save & Apply Rule", type="primary"):
            if target_keyword:
                save_category_rule(target_keyword, selected_new_cat)
                st.session_state["feedback"] = {
                    "type": "success",
                    "msg": f"Rule saved! All transactions containing '{target_keyword}' set to '{selected_new_cat}'."
                }
                st.rerun()
                
    st.markdown("---")
    st.subheader("📋 Active Custom Rules")
    active_rules = load_category_rules()
    if active_rules:
        rules_df = pd.DataFrame(list(active_rules.items()), columns=['Keyword / Payee', 'Assigned Category'])
        st.dataframe(rules_df, use_container_width=True, hide_index=True)
        
        # Option to delete a rule
        st.markdown("#### 🗑️ Delete a Custom Rule")
        col_del1, col_del2 = st.columns([3, 1])
        with col_del1:
            rule_to_delete = st.selectbox("Select Rule to Remove", options=list(active_rules.keys()))
        with col_del2:
            st.write("")
            st.write("")
            if st.button("Delete Selected Rule", type="secondary"):
                if rule_to_delete:
                    delete_category_rule(rule_to_delete)
                    reapply_all_categories()
                    st.session_state["feedback"] = {
                        "type": "info",
                        "msg": f"Rule for '{rule_to_delete}' deleted and affected transactions re-categorized."
                    }
                    st.rerun()
    else:
        st.info("No custom rules created yet. Built-in rules are currently active.")
        
    st.markdown("---")
    st.subheader("➕ Custom Categories Manager")
    st.markdown("Create your own spending categories (e.g. `Gym & Fitness`, `Pets`, `Donations`, `Investment`).")
    
    col_add_c1, col_add_c2 = st.columns([3, 1])
    with col_add_c1:
        new_category_input = st.text_input("New Category Name", placeholder="e.g. Gym & Fitness")
    with col_add_c2:
        st.write("")
        st.write("")
        if st.button("Add Category", type="primary"):
            cat_name = new_category_input.strip()
            if cat_name:
                if add_custom_category(cat_name):
                    st.session_state["feedback"] = {
                        "type": "success",
                        "msg": f"Category '{cat_name}' added successfully!"
                    }
                    st.rerun()
                else:
                    st.warning(f"Category '{cat_name}' already exists.")
                    
    # Delete custom category
    custom_categories = get_custom_categories()
    if custom_categories:
        st.markdown("#### 🗑️ Delete a Custom Category")
        col_del_c1, col_del_c2 = st.columns([3, 1])
        with col_del_c1:
            category_to_delete = st.selectbox("Select Custom Category to Remove", options=custom_categories)
        with col_del_c2:
            st.write("")
            st.write("")
            if st.button("Delete Category", type="secondary"):
                if category_to_delete:
                    delete_custom_category(category_to_delete)
                    st.session_state["feedback"] = {
                        "type": "info",
                        "msg": f"Category '{category_to_delete}' deleted. Associated transactions updated to 'Other'."
                    }
                    st.rerun()
                    
    st.markdown("---")
    with st.expander("⚠️ Danger Zone (Reset Database)"):
        st.warning("Deleting will remove all stored transactions from the database. Custom rules will remain.")
        if st.button("Delete All Stored Transactions", type="secondary"):
            delete_all_transactions()
            st.session_state["feedback"] = {
                "type": "warning",
                "msg": "Transactions cleared from database."
            }
            st.rerun()
