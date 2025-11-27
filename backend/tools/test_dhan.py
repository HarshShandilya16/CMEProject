# backend/tools/test_dhan_real.py
import os, requests, csv, io, json, sys
from dotenv import load_dotenv

load_dotenv()
BASE = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2").rstrip("/")
CID = os.getenv("DHAN_CLIENT_ID")
TOK = os.getenv("DHAN_ACCESS_TOKEN")

if not CID or not TOK:
    print("ERROR: set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in .env")
    sys.exit(1)

HEADERS = {"client-id": CID, "access-token": TOK, "Content-Type": "application/json"}

CSV_URL_COMPACT = "https://images.dhan.co/api-data/api-scrip-master.csv"
CSV_URL_DETAILED = "https://images.dhan.co/api-data/api-scrip-master-detailed.csv"

def get_csv(url):
    print("Downloading instrument CSV from:", url)
    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        print("Failed to download CSV:", r.status_code, r.text[:400])
        return None
    return r.text

def find_security_ids(csv_text, symbols_to_find):
    found = {}
    f = io.StringIO(csv_text)
    reader = csv.DictReader(f)
    for row in reader:
        # common columns: SecurityId, TradingSymbol, CompanyName, Exchange
        sym = (row.get("TradingSymbol") or row.get("symbol") or row.get("TradSym") or "").strip().upper()
        secid = row.get("SecurityId") or row.get("securityId") or row.get("SecurityID") or row.get("security_id")
        if not sym or not secid:
            continue
        for s in symbols_to_find:
            if s.upper() == sym and s.upper() not in found:
                found[s.upper()] = {"SecurityId": secid, "row": row}
        if len(found) == len(symbols_to_find):
            break
    return found

def short(obj, n=800):
    s = json.dumps(obj, indent=2)
    return (s[:n] + "...(truncated)") if len(s) > n else s

symbols = ["NIFTY", "BANKNIFTY", "RELIANCE", "HDFCBANK", "TCS"]
csv_text = get_csv(CSV_URL_DETAILED) or get_csv(CSV_URL_COMPACT)
if not csv_text:
    sys.exit(1)

found = find_security_ids(csv_text, symbols)
print("\nFound symbol -> SecurityId mapping (if any):")
for s in symbols:
    print(s, "->", found.get(s.upper(), {}).get("SecurityId"))

# pick first found SecurityId to test optionchain
test_symbol = None
test_secid = None
for s in symbols:
    if s.upper() in found:
        test_symbol = s.upper()
        test_secid = found[s.upper()]["SecurityId"]
        break

if not test_secid:
    print("\nNo SecurityId found for the target symbols. Please paste one instrument CSV row here (sanitized).")
    sys.exit(0)

print(f"\nUsing {test_symbol} SecurityId={test_secid} for optionchain test.")

# call optionchain endpoint -- Dhan docs show POST /optionchain
url = f"{BASE}/optionchain"
payload = {
    # Dhan expects UnderlyingScrip as SecurityId, and UnderlyingSeg segment code may vary:
    "UnderlyingScrip": int(test_secid) if str(test_secid).isdigit() else test_secid,
    # try a common segment for indices vs equity; we try IDX_I for indices and EQ for equities
    "UnderlyingSeg": "IDX_I" if test_symbol in ("NIFTY", "BANKNIFTY", "FINNIFTY") else "EQ"
}
print("POST", url, "payload:", payload)
r = requests.post(url, headers=HEADERS, json=payload, timeout=30)

print("Status:", r.status_code, "Content-Type:", r.headers.get("content-type"))
try:
    j = r.json()
except Exception:
    print("Non-JSON response (first 200 chars):")
    print(r.text[:2000])
    sys.exit(0)

# Print top-level keys and show one strike sample if present
print("Top-level keys:", list(j.keys())[:20])
# if response contains a list or 'data' key, find one strike block
sample = None
if isinstance(j, dict):
    if "data" in j and isinstance(j["data"], list) and j["data"]:
        sample = j["data"][0]
    # some variants may have 'records' -> 'data'
    elif "records" in j and isinstance(j["records"], dict) and isinstance(j["records"].get("data"), list):
        sample = j["records"]["data"][0]
    # or oc, or optionChain or similar
    elif "oc" in j:
        sample = j["oc"][0] if isinstance(j["oc"], list) and j["oc"] else None
elif isinstance(j, list):
    sample = j[0]

print("\nSample strike/data (trimmed):")
if sample:
    print(short(sample, 2000))
else:
    print("No strike data found in response. Printing small JSON:")
    print(short(j, 2000))

print("\nDone. If you want me to adapt the parser, paste the small `sample` JSON block above (masking any personal tokens if present).")
