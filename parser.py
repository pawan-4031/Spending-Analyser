import pdfplumber
import re
import io
from datetime import datetime
from categorizer import categorize_transaction
from database import load_category_rules

def parse_date_time(date_str: str, time_str: str = ""):
    """Parses date like '01 Sep, 2026' and time like '12:00 PM' into standard format."""
    clean_date = re.sub(r'\s+', ' ', date_str).strip()
    clean_time = re.sub(r'\s+', ' ', time_str).strip()
    
    # If date is like "01Sep,2026", add spaces: "01 Sep, 2026"
    spaced_date = re.sub(r"(\d{1,2})([A-Za-z]{3}),?(\d{4})", r"\1 \2, \3", clean_date)
    
    combined = f"{spaced_date} {clean_time}".strip()
    for fmt in [
        "%d %b, %Y %I:%M %p",
        "%d %B, %Y %I:%M %p",
        "%d %b %Y %I:%M %p",
        "%d %B %Y %I:%M %p",
        "%d %b, %Y",
        "%d %B, %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y-%m-%d %H:%M:%S"
    ]:
        try:
            dt = datetime.strptime(combined, fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S"), dt.strftime("%Y-%m-%d"), dt.strftime("%Y-%m")
        except ValueError:
            continue
            
    # Fallback parsing
    for fmt in ["%d %b, %Y", "%d %B, %Y", "%d %b %Y", "%d %B %Y"]:
        try:
            dt = datetime.strptime(spaced_date, fmt)
            return dt.strftime("%Y-%m-%d 00:00:00"), dt.strftime("%Y-%m-%d"), dt.strftime("%Y-%m")
        except ValueError:
            continue

    return combined, clean_date[:10], ""

def parse_amount(amt_str: str) -> float:
    """Extracts numeric amount from strings like '₹54,111.23' or '₹70'."""
    if not amt_str:
        return 0.0
    cleaned = re.sub(r'[^\d.]', '', amt_str)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def extract_transactions_from_text(page_text: str, user_rules: dict):
    """
    Parses transactions from page text.
    Handles both standard spacing and tight-font spacing (e.g. '01Sep,2026', 'Paidto').
    """
    transactions = []
    lines = [l.strip() for l in page_text.split("\n") if l.strip()]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Match Date: "01 Sep, 2026" or "01Sep,2026" or "4 Sep 2026"
        date_m = re.search(r"(\d{1,2}\s*[A-Za-z]{3},?\s*\d{4})", line)
        if date_m:
            date_str = date_m.group(1)
            time_str = ""
            action_type = "DEBIT"
            party = "Unknown"
            txn_id = ""
            amount = 0.0
            payment_mode = "Unknown"
            raw_details_lines = []
            
            remainder = line[date_m.end():].strip()
            
            # Extract amount from remainder if present
            amt_m = re.search(r"(?:[₹\u20b9]|Rs\.?|INR|[^\w\s\d])?\s*([\d,]+(?:\.\d{2})?)\s*$", remainder)
            if amt_m and amt_m.group(1):
                try:
                    amount = float(amt_m.group(1).replace(",", ""))
                    remainder = remainder[:amt_m.start()].strip()
                    remainder = re.sub(r"\s*(?:[₹\u20b9]|Rs\.?|INR|[^\w\s])+\s*$", "", remainder).strip()
                except ValueError:
                    pass
                    
            # Extract action & party from remainder
            if remainder:
                raw_details_lines.append(remainder)
                if re.search(r"^(?:Paid\s*to)\s*(.+)", remainder, re.IGNORECASE):
                    action_type = "DEBIT"
                    party = re.sub(r"^(?:Paid\s*to)\s*", "", remainder, flags=re.IGNORECASE).strip()
                elif re.search(r"^(?:Received\s*from)\s*(.+)", remainder, re.IGNORECASE):
                    action_type = "CREDIT"
                    party = re.sub(r"^(?:Received\s*from)\s*", "", remainder, flags=re.IGNORECASE).strip()
                elif re.search(r"^(?:Top-?\s*up\s*to)\s*(.+)", remainder, re.IGNORECASE):
                    action_type = "WALLET_TOPUP"
                    party = re.sub(r"^(?:Top-?\s*up\s*to)\s*", "", remainder, flags=re.IGNORECASE).strip()
                elif re.search(r"^(?:Self\s*transfer\s*to)\s*(.+)", remainder, re.IGNORECASE):
                    action_type = "SELF_TRANSFER"
                    party = re.sub(r"^(?:Self\s*transfer\s*to)\s*", "", remainder, flags=re.IGNORECASE).strip()

            # Look ahead for remaining fields
            j = i + 1
            while j < len(lines) and j <= i + 6:
                next_line = lines[j]
                if re.search(r"^\d{1,2}\s*[A-Za-z]{3},?\s*\d{4}", next_line):
                    break
                if "Date" in next_line and "Transaction" in next_line:
                    break
                if "Note:" in next_line or "Page " in next_line or "Powered by" in next_line:
                    break
                    
                raw_details_lines.append(next_line)
                
                # Time
                time_m = re.search(r"(\d{1,2}:\d{2}\s*[AP]M)", next_line, re.IGNORECASE)
                if time_m and not time_str:
                    time_str = time_m.group(1)
                    
                # UPI ID
                id_m = re.search(r"UPI\s*Transaction\s*ID\s*:\s*([A-Za-z0-9]+)", next_line, re.IGNORECASE)
                if id_m:
                    txn_id = id_m.group(1)
                    
                # Party if not found on line 1
                if party == "Unknown":
                    if re.search(r"^Paid\s*to\s*(.+)", next_line, re.IGNORECASE):
                        action_type = "DEBIT"
                        party = re.sub(r"^Paid\s*to\s*", "", next_line, flags=re.IGNORECASE).strip()
                    elif re.search(r"^Received\s*from\s*(.+)", next_line, re.IGNORECASE):
                        action_type = "CREDIT"
                        party = re.sub(r"^Received\s*from\s*", "", next_line, flags=re.IGNORECASE).strip()
                    elif re.search(r"^Top-?\s*up\s*to\s*(.+)", next_line, re.IGNORECASE):
                        action_type = "WALLET_TOPUP"
                        party = re.sub(r"^Top-?\s*up\s*to\s*", "", next_line, flags=re.IGNORECASE).strip()
                    elif re.search(r"^Self\s*transfer\s*to\s*(.+)", next_line, re.IGNORECASE):
                        action_type = "SELF_TRANSFER"
                        party = re.sub(r"^Self\s*transfer\s*to\s*", "", next_line, flags=re.IGNORECASE).strip()

                # Payment mode
                if re.search(r"^Paid\s*by\s*(.+)", next_line, re.IGNORECASE):
                    payment_mode = re.sub(r"^Paid\s*by\s*", "", next_line, flags=re.IGNORECASE).strip()
                    j += 1
                    continue
                elif re.search(r"^Paid\s*to\s*(.+)", next_line, re.IGNORECASE) and action_type == "CREDIT":
                    payment_mode = re.sub(r"^Paid\s*to\s*", "", next_line, flags=re.IGNORECASE).strip()
                    j += 1
                    continue
                    
                # Amount if not captured yet
                if amount == 0.0 and "UPI" not in next_line:
                    amt_line_m = re.search(r"^[₹\u20b9Rs\.]*\s*([\d,]+(?:\.\d{2})?)$", next_line.strip())
                    if amt_line_m and amt_line_m.group(1):
                        try:
                            val = float(amt_line_m.group(1).replace(",", ""))
                            if val > 0:
                                amount = val
                        except ValueError:
                            pass
                j += 1
                
            if txn_id:
                iso_dt, txn_date, month_yr = parse_date_time(date_str, time_str)
                cat = categorize_transaction(party, action_type, user_rules)
                transactions.append({
                    "txn_id": txn_id,
                    "date_time": iso_dt,
                    "txn_date": txn_date,
                    "statement_month": month_yr,
                    "txn_type": action_type,
                    "party": party,
                    "payment_method": payment_mode,
                    "amount": amount,
                    "category": cat,
                    "raw_details": "\n".join(raw_details_lines)
                })
                i = j
                continue
        i += 1
        
    return transactions

def parse_gpay_pdf(file_path_or_bytes):
    """
    Parses a Google Pay statement PDF and extracts all transactions.
    Works with file paths, Streamlit UploadedFile, and BytesIO.
    """
    user_rules = load_category_rules()
    transactions = []
    
    if hasattr(file_path_or_bytes, 'seek'):
        file_path_or_bytes.seek(0)
        
    try:
        with pdfplumber.open(file_path_or_bytes) as pdf:
            for page in pdf.pages:
                # 1. First attempt with x_tolerance=1 (reconstructs natural word spacing)
                page_text = page.extract_text(x_tolerance=1)
                page_txns = extract_transactions_from_text(page_text, user_rules) if page_text else []
                
                # 2. Fallback to default x_tolerance if no transactions found
                if not page_txns:
                    page_text = page.extract_text()
                    if page_text:
                        page_txns = extract_transactions_from_text(page_text, user_rules)
                        
                if page_txns:
                    transactions.extend(page_txns)
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        
    return transactions
