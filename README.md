# UPI Spending Analyser 💳

A local-first, privacy-focused spending analyser specifically designed for **Google Pay** and UPI transaction statements in PDF format.

---

## 🌟 Key Features

1. **🔒 100% Offline & Private:**
   - All statement parsing, storage, and analytics run entirely on your local machine.
   - Your sensitive financial information never leaves your computer.

2. **🧠 Persistent Local Memory (SQLite):**
   - Automatically stores all uploaded transactions in a local SQLite database (`transactions.db`).
   - You can upload new statement PDFs month after month—the app aggregates all your months seamlessly.
   - Automatically skips duplicates using the 12-digit **UPI Transaction ID**.

3. **📊 Rich Analytics & Visuals:**
   - **Spending by Category:** Interactive Donut chart.
   - **Payment Method Split:** Separate tracking for **RuPay Credit Card vs Bank Accounts vs UPI Lite**.
   - **Top Payees / Merchants:** Horizontal bar charts showing where most of your money goes.
   - **Daily Spending Trends:** Day-by-day cashflow bar chart.
   - **Filters:** Filter by month, date, payment source, or category.

4. **🏷️ Custom Rule Engine (Teach the Analyser):**
   - If a person or vendor is categorized as `"P2P Transfers"` or `"Other"`, you can reassign them (e.g. assign `"MANISH WANGCHUK SHERPA"` to `"Food & Dining"` or `"Rent"`).
   - The app updates all existing transactions for that payee and remembers the rule for all future PDF uploads!

5. **📥 Data Export:**
   - Search transactions by name, UPI ID, or bank account.
   - Export filtered transactions directly to CSV with one click.

---

## 🚀 How to Launch the Application

### Method 1: 1-Click Launch (Recommended)
Simply **double-click** the file:
```text
run.bat
```
This automatically starts the local server and opens your browser directly to `http://localhost:8501`.

### Method 2: From Terminal
```bash
cd "d:\projects\spending analyser"
.\.venv\Scripts\activate
streamlit run app.py
```

---

## 📁 Project Structure

* `app.py`: Main Streamlit web application interface and dashboard.
* `parser.py`: PDF parser using `pdfplumber` to extract structured transactions from Google Pay statements.
* `categorizer.py`: Smart rules engine for categorizing merchants and P2P transfers.
* `database.py`: SQLite persistence layer (`transactions.db`).
* `run.bat`: Quick launcher for Windows.
* `test_analyser.py`: Verification tests for the parser and database.

