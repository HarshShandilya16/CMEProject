# backend/tools/debug_dhan_auth.py
import os, requests, json, time
from dotenv import load_dotenv

load_dotenv()
BASE = os.getenv("DHAN_API_BASE", "https://api.dhan.co/v2").rstrip("/")
CID  = os.getenv("DHAN_CLIENT_ID", "").strip()
TOK  = os.getenv("DHAN_ACCESS_TOKEN", "").strip()

if not CID or not TOK:
    print("ERROR: DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN missing in .env")
    raise SystemExit(1)

UNDERLYING_SCRIP = 500325  # RELIANCE from your mapping
CANDIDATE_SEGS = ["D", "EQ", "IDX_I", "IDX", "OP", "C"]

# Try header styles
header_variants = {
    "client-id + access-token (lowercase)": {"client-id": CID, "access-token": TOK},
    "Client-Id + Access-Token (Camel)": {"Client-Id": CID, "Access-Token": TOK},
    "client_id + access_token (underscore)": {"client_id": CID, "access_token": TOK},
    "Authorization: Bearer <token> (bearer)": {"Authorization": f"Bearer {TOK}"},
    "x-client-id + x-access-token": {"x-client-id": CID, "x-access-token": TOK},
}

def do_post(headers, seg):
    url = f"{BASE}/optionchain"
    payload = {"UnderlyingScrip": UNDERLYING_SCRIP, "UnderlyingSeg": seg}
    print("\nPOST", url)
    print("payload:", payload)
    print("headers used:", headers)
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=30)
    except Exception as e:
        print("Request failed:", e)
        return None
    print("status:", r.status_code, " content-type:", r.headers.get("content-type"))
    # print full body (trim if very long)
    try:
        j = r.json()
        print("response JSON (trimmed):")
        print(json.dumps(j, indent=2)[:5000])
    except Exception:
        txt = r.text or "<no-body>"
        print("response text (first 2000 chars):")
        print(txt[:2000])
    return r

# Run one seg at a time for a single headers variant (to avoid rate limits)
# We'll try each headers variant with the first candidate seg.
seg_to_try = CANDIDATE_SEGS[0]
print("Trying segment:", seg_to_try)
for name, hdrs in header_variants.items():
    print("\n=== Testing header variant:", name, "===\n")
    # include content-type for all
    hdrs_with_ct = dict(hdrs)
    hdrs_with_ct["Content-Type"] = "application/json"
    r = do_post(hdrs_with_ct, seg_to_try)
    # wait a few seconds to be polite to the API
    time.sleep(2)
