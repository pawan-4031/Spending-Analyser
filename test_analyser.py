from database import init_db, save_transactions, load_transactions_df, delete_all_transactions
from categorizer import categorize_transaction
from parser import extract_transactions_from_text, parse_date_time, parse_amount

SAMPLE_GPAY_TEXT = """Transaction statement
6294719288, purnahangmadhen@gmail.com
Transaction statement period: 01 September 2026 - 30 September 2026
Date & time Transaction details Amount
01 Sep, 2026 Paid to DADIRAM CHETTRI ₹70
12:00 PM UPI Transaction ID: 624490960209
Paid by ICICI Bank XX01 | RuPay credit card
06 Sep, 2026 Received from Kongchen Lepcha ₹100
01:51 PM UPI Transaction ID: 661501716691
Paid to State Bank of India 6799
07 Sep, 2026 Top-up to UPI Lite ₹500
09:07 AM UPI Transaction ID: 661665095929
Paid by State Bank of India 6799
07 Sep, 2026 Self transfer to Union Bank of India 0233 ₹1,500
03:50 PM UPI Transaction ID: 625068354489
Paid by State Bank of India 6799
25 Sep, 2026 Paid to FLIPKART INTERNET PVT LTD ₹2,938
06:53 PM UPI Transaction ID: 626812496791
Paid by State Bank of India 6799"""

def test_pipeline():
    init_db()
    delete_all_transactions()
    
    # 1. Test text extractor
    txns = extract_transactions_from_text(SAMPLE_GPAY_TEXT, user_rules={})
    assert len(txns) == 5, f"Expected 5 txns, got {len(txns)}"
    
    t0 = txns[0]
    assert t0['party'] == "DADIRAM CHETTRI"
    assert t0['txn_type'] == "DEBIT"
    assert t0['amount'] == 70.0
    assert t0['txn_id'] == "624490960209"
    assert "RuPay" in t0['payment_method']
    
    t1 = txns[1]
    assert t1['party'] == "Kongchen Lepcha"
    assert t1['txn_type'] == "CREDIT"
    assert t1['amount'] == 100.0
    assert t1['txn_id'] == "661501716691"
    
    t2 = txns[2]
    assert t2['party'] == "UPI Lite"
    assert t2['txn_type'] == "WALLET_TOPUP"
    assert t2['amount'] == 500.0
    
    t3 = txns[3]
    assert t3['party'] == "Union Bank of India 0233"
    assert t3['txn_type'] == "SELF_TRANSFER"
    assert t3['amount'] == 1500.0
    
    t4 = txns[4]
    assert "FLIPKART" in t4['party']
    assert t4['category'] == "Shopping"
    assert t4['amount'] == 2938.0
    
    # 2. Test database insert & deduplication
    inserted, dupes = save_transactions(txns)
    assert inserted == 5
    assert dupes == 0
    
    # Re-insert should detect all as duplicates
    inserted2, dupes2 = save_transactions(txns)
    assert inserted2 == 0
    assert dupes2 == 5
    
    df = load_transactions_df()
    assert len(df) == 5
    
    delete_all_transactions()
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_pipeline()
