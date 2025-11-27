# backend/tools/try_optionchain_variants.py
import os, requests, json, time
from dotenv import load_dotenv

load_dotenv()
BASE = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2").rstrip("/")
CID  = os.getenv("DHAN_CLIENT_ID")
TOK  = os.getenv("DHAN_ACCESS_TOKEN")

if not CID or not TOK:
    print("Set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in .env")
    raise SystemExit(1)

HEADERS = {"client-id": CID, "access-token": TOK, "Content-Type": "application/json"}

# Use the IDs you just discovered
targets = {
    "RELIANCE": {"id": "500325", "segment_csv": "D"},
    "HDFCBANK": {"id": "500180", "segment_csv": "D"},
    "TCS": {"id": "532540", "segment_csv": "D"},
    "BANKNIFTY": {"id": "26009", "segment_csv": "D"},
    "FINNIFTY": {"id": "26037", "segment_csv": "D"},
    "NIFTY": {"id": "0", "segment_csv": "C"},  # NIFTY had 0 in CSV — we'll still try some variants
}

# Candidate segment values to try for each underlying (order matters)
candidate_segs = ["D", "EQ", "IDX_I", "IDX", "OP", "C"]

def short(x, n=1200):
    s = json.dumps(x, indent=2, default=str)
    return (s[:n] + "\n...(truncated)") if len(s) > n else s

for sym, info in targets.items():
    uid = info["id"]
    print("\n\n=== Testing", sym, "UNDERLYING_SECURITY_ID:", uid, "csv-seg:", info['segment_csv'], "===")
    if not uid or str(uid) in ("", "0", "None"):
        print("  NOTE: found id is empty or 0 — we'll still attempt common segs but NIFTY may need special handling.")
    tried_any = False
    for seg in candidate_segs:
        payload = {"UnderlyingScrip": int(uid) if str(uid).isdigit() else uid, "UnderlyingSeg": seg}
        url = f"{BASE}/optionchain"
        try:
            r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
        except Exception as e:
            print(f"  ERROR POST {seg}: {e}")
            continue
        print(f"  POST seg={seg} -> status {r.status_code}, content-type: {r.headers.get('content-type')}")
        tried_any = True
        # try parse JSON safely
        try:
            j = r.json()
        except Exception:
            txt = r.text or "<no-body>"
            print("   Non-JSON response (trim):", txt[:800])
            # if 401/403/404/429: bail for this seg and show reason
            if r.status_code in (401,403,404,429):
                print("   (HTTP error or non-JSON body)")
            time.sleep(1)
            continue

        # If JSON returned, show top-level keys and a small sample object
        print("   Top-level keys:", list(j.keys())[:20] if isinstance(j, dict) else "list")
        sample = None
        if isinstance(j, dict):
            if "data" in j and isinstance(j["data"], list) and j["data"]:
                sample = j["data"][0]
            elif "records" in j and isinstance(j["records"], dict) and isinstance(j["records"].get("data"), list):
                sample = j["records"]["data"][0]
            elif "oc" in j and isinstance(j["oc"], list) and j["oc"]:
                sample = j["oc"][0]
            elif isinstance(j.get("optionChain"), list):
                sample = j["optionChain"][0]
        elif isinstance(j, list) and j:
            sample = j[0]
        if sample:
            print("   Sample strike/object:\n", short(sample, 1500))
        else:
            print("   No strike sample found in JSON (check full response).")
        # If we got meaningful JSON, stop trying other segments for this symbol
        break

    if not tried_any:
        print("  Could not make any POST requests for this symbol (network issues).")
