import re

DEFAULT_CATEGORIES = [
    "Food & Dining",
    "Groceries & Essentials",
    "Shopping",
    "Entertainment & Subscriptions",
    "Bills & Utilities",
    "Credit Card & Finance",
    "Travel & Commute",
    "Education & Fees",
    "Health & Personal Care",
    "Services",
    "P2P Transfers",
    "Income & Cashback",
    "Investments",
    "Other"
]

# Keyword rules (checked case-insensitively)
BUILTIN_RULES = [
    # Food & Dining
    (r"swiggy|zomato|nisha.*food|restaurant|cafe|dhaba|bakery|chaayos|starbucks|mcdonald|kfc|burger|pizza|dosa|tea stall", "Food & Dining"),
    
    # Groceries & Essentials
    (r"amazon pay grocer|ration shop|blinkit|zepto|instamart|bigbasket|dmart|kirana|supermarket|vegetable|fruit|milk", "Groceries & Essentials"),
    
    # Shopping & E-commerce
    (r"flipkart|myntra|meesho|nykaa|ajio|zara|h&m|decathlon|retail", "Shopping"),
    
    # Entertainment, Gaming & Subscriptions
    (r"valve corporation|steam|spotify|google play|netflix|prime video|youtube|hotstar|sonyliv|bookmyshow", "Entertainment & Subscriptions"),
    
    # Bills, Recharge & Utilities
    (r"jio prepaid|airtel|vodafone|vi prepaid|electricity|bescom|water board|gas|fastag|recharge", "Bills & Utilities"),
    
    # Credit Card & Financial Services
    (r"credit card|icici bank credit|sbi card|cred|hdfc card|axis card|loan|emi|insurance", "Credit Card & Finance"),
    
    # Travel & Transport
    (r"uber|ola|rapido|metro|irctc|railway|makemytrip|redbus|petrol|fuel|hpcl|bpcl|indian oil", "Travel & Commute"),
    
    # Education & Institutional Fees
    (r"nit sikkim|university|college|school|exam|coursera|udemy|fees", "Education & Fees"),
    
    # Health & Personal Care
    (r"pharmacy|apollo|netmeds|1mg|hospital|clinic|chemist|salon|spa", "Health & Personal Care"),
    
    # General Services
    (r"photo studio|prakash photo|tailor|laundry|repair|dry cleaner", "Services"),
    
    # Rewards / Cashback
    (r"google pay rewards|cashback|scratch card", "Income & Cashback"),
]

def get_all_categories():
    """Returns combined list of default and user-defined custom categories."""
    from database import get_custom_categories
    custom = get_custom_categories()
    cats = list(DEFAULT_CATEGORIES)
    for c in custom:
        if c not in cats:
            if "Other" in cats:
                cats.insert(cats.index("Other"), c)
            else:
                cats.append(c)
    return cats

def categorize_transaction(party: str, txn_type: str, user_rules: dict = None) -> str:
    """
    Categorizes a transaction based on party name and transaction type.
    1. Checks user custom rules first
    2. Checks built-in regex rules
    3. Handles special transaction types (Self Transfer, Wallet Top-up, Income)
    4. Defaults unknown 'Paid to' as P2P Transfers
    """
    party_clean = party.strip()
    party_lower = party_clean.lower()
    
    # 1. Custom user rules (exact or substring match)
    if user_rules:
        for keyword, category in user_rules.items():
            if keyword.lower() in party_lower:
                return category
                
    # 2. Transaction type special cases
    if txn_type == "SELF_TRANSFER":
        return "Self Transfer"
    if txn_type == "WALLET_TOPUP":
        return "UPI Lite Top-up"
    if txn_type == "CREDIT":
        if "rewards" in party_lower or "cashback" in party_lower:
            return "Income & Cashback"
        return "Received (P2P / Income)"
        
    # 3. Built-in Regex Rules
    for pattern, category in BUILTIN_RULES:
        if re.search(pattern, party_lower):
            return category
            
    # 4. Default: If it's a person/unknown merchant debit
    return "P2P Transfers"

def reapply_all_categories():
    """Re-applies category rules and builtin rules to all existing transactions."""
    from database import get_connection, load_category_rules
    rules = load_category_rules()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT txn_id, party, txn_type FROM transactions")
    rows = cursor.fetchall()
    for row in rows:
        t_id, party, t_type = row[0], row[1], row[2]
        cat = categorize_transaction(party, t_type, rules)
        cursor.execute("UPDATE transactions SET category = ? WHERE txn_id = ?", (cat, t_id))
    conn.commit()
    conn.close()
