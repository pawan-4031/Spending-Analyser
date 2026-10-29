import sqlite3
import os
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "transactions.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            txn_id TEXT PRIMARY KEY,
            date_time TEXT,
            txn_date TEXT,
            txn_type TEXT,
            party TEXT,
            payment_method TEXT,
            amount REAL,
            category TEXT,
            statement_month TEXT,
            raw_details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Custom category rules table (maps party -> category)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category_rules (
            party_keyword TEXT PRIMARY KEY,
            category TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Custom user-created categories table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS custom_categories (
            category_name TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_transactions(transactions_list):
    """
    Inserts a list of dicts.
    Uses INSERT OR IGNORE on txn_id to prevent duplicates.
    Returns (inserted_count, duplicate_count)
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    inserted = 0
    duplicates = 0
    
    for t in transactions_list:
        try:
            cursor.execute("""
                INSERT INTO transactions (
                    txn_id, date_time, txn_date, txn_type, party,
                    payment_method, amount, category, statement_month, raw_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t['txn_id'],
                t.get('date_time', ''),
                t.get('txn_date', ''),
                t.get('txn_type', 'DEBIT'),
                t.get('party', ''),
                t.get('payment_method', ''),
                float(t.get('amount', 0.0)),
                t.get('category', 'Uncategorized'),
                t.get('statement_month', ''),
                t.get('raw_details', '')
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            duplicates += 1
            
    conn.commit()
    conn.close()
    return inserted, duplicates

def load_transactions_df():
    """Loads all transactions into a pandas DataFrame."""
    conn = get_connection()
    try:
        df = pd.read_sql_query("SELECT * FROM transactions ORDER BY date_time DESC", conn)
        return df
    finally:
        conn.close()

def update_transaction_category(txn_id, new_category):
    """Update category for a specific transaction."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE transactions SET category = ? WHERE txn_id = ?", (new_category, txn_id))
    conn.commit()
    conn.close()

def save_category_rule(party_keyword, category):
    """Saves a rule that maps a party keyword to a category and updates existing transactions."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO category_rules (party_keyword, category, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(party_keyword) DO UPDATE SET category=excluded.category, updated_at=CURRENT_TIMESTAMP
    """, (party_keyword.strip(), category))
    
    # Update all existing transactions with this party
    cursor.execute("""
        UPDATE transactions 
        SET category = ? 
        WHERE LOWER(party) LIKE '%' || LOWER(?) || '%'
    """, (category, party_keyword.strip()))
    
    conn.commit()
    conn.close()

def load_category_rules():
    """Returns a dictionary of party_keyword -> category."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT party_keyword, category FROM category_rules")
    rules = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return rules

def delete_category_rule(party_keyword):
    """Deletes a custom category rule."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM category_rules WHERE LOWER(party_keyword) = LOWER(?)", (party_keyword.strip(),))
    conn.commit()
    conn.close()

def get_custom_categories():
    """Returns list of custom category names."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category_name FROM custom_categories ORDER BY category_name ASC")
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    return categories

def add_custom_category(category_name):
    """Adds a new custom category."""
    name = category_name.strip()
    if not name:
        return False
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO custom_categories (category_name) VALUES (?)", (name,))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def delete_custom_category(category_name):
    """Deletes a custom category, removes rules using it, and resets affected transactions to 'Other'."""
    name = category_name.strip()
    conn = get_connection()
    cursor = conn.cursor()
    
    # Delete from custom_categories
    cursor.execute("DELETE FROM custom_categories WHERE LOWER(category_name) = LOWER(?)", (name,))
    
    # Delete any rules mapping to this category
    cursor.execute("DELETE FROM category_rules WHERE LOWER(category) = LOWER(?)", (name,))
    
    # Update transactions tagged with this category to 'Other'
    cursor.execute("UPDATE transactions SET category = 'Other' WHERE LOWER(category) = LOWER(?)", (name,))
    
    conn.commit()
    conn.close()

def delete_all_transactions():
    """Wipes transactions."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    conn.commit()
    conn.close()
