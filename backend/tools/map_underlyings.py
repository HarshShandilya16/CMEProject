import csv, io, requests, sys

CSV_URL = "https://images.dhan.co/api-data/api-scrip-master-detailed.csv"

TARGETS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "HDFCBANK", "TCS"]

def download_csv(url):
    print("Downloading CSV:", url)
    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        print("Failed to download CSV:", r.status_code)
        print(r.text[:500])
        sys.exit(1)
    return r.text

def map_underlying_ids(csv_text, targets):
    f = io.StringIO(csv_text)
    reader = csv.DictReader(f)
    header = reader.fieldnames
    print("Header columns:", header)

    result = {t: None for t in targets}

    for row in reader:
        u_sym = (row.get("UNDERLYING_SYMBOL") or "").strip().upper()
        u_id  = row.get("UNDERLYING_SECURITY_ID") or row.get("UNDERLYING_SECURITYID")
        instr_type = (row.get("INSTRUMENT_TYPE") or row.get("INSTRUMENT") or "").upper()
        seg = (row.get("SEGMENT") or "").upper()
        exch = (row.get("EXCH_ID") or "").upper()

        if not u_sym or not u_id:
            continue

        for t in targets:
            if result[t] is not None:
                continue

            # match underlying symbol exactly
            if u_sym == t.upper():
                # we prefer derivatives rows (OPTSTK / OPTIDX on derivative segment)
                result[t] = {
                    "UNDERLYING_SECURITY_ID": u_id,
                    "UNDERLYING_SYMBOL": u_sym,
                    "INSTRUMENT_TYPE": instr_type,
                    "SEGMENT": seg,
                    "EXCH_ID": exch,
                }

    return result

if __name__ == "__main__":
    txt = download_csv(CSV_URL)
    mapping = map_underlying_ids(txt, TARGETS)

    print("\n=== Underlying mapping ===")
    for t, info in mapping.items():
        print(f"{t}: {info}")
