# backend/tools/scan_instruments_csv.py
import csv, io, requests, sys

CSV_URL = "https://images.dhan.co/api-data/api-scrip-master-detailed.csv"
TARGETS = ["NIFTY", "BANKNIFTY", "RELIANCE", "HDFCBANK", "TCS"]

def download_csv(url):
    print("Downloading CSV:", url)
    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        print("Failed to download CSV:", r.status_code)
        print(r.text[:500])
        sys.exit(1)
    return r.text

def find_matches(csv_text, targets):
    f = io.StringIO(csv_text)
    reader = csv.DictReader(f)
    header = reader.fieldnames
    print("Header columns:", header)
    found = {t: [] for t in targets}
    count = 0
    for row in reader:
        line = " ".join((row.get(k,"") or "") for k in row.keys())
        upper = line.upper()
        for t in targets:
            if t.upper() in upper:
                if len(found[t]) < 10:
                    found[t].append(row)
        count += 1
        if count % 50000 == 0:
            print(f"Scanned {count} rows...")
    return found

if __name__ == "__main__":
    txt = download_csv(CSV_URL)
    matches = find_matches(txt, TARGETS)
    for t, rows in matches.items():
        print("\n=== Matches for", t, " (showing up to 10) ===")
        if not rows:
            print("  No matches found.")
        else:
            for i, r in enumerate(rows, 1):
                print(f"\n--- row #{i} ---")
                # print trimmed key:value pairs
                for k,v in r.items():
                    if v and len(v) > 250:
                        v = v[:250] + "...(truncated)"
                    print(f"{k}: {v}")
