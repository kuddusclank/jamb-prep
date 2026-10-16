import json

with open('jambprep/scripts/phe-parsed-raw.json') as f:
    raw_data = json.load(f)

for yr in ['2022', '2023', '2024', '2025']:
    print(f"=== {yr} ({len(raw_data[yr])} items) ===")
    for q in raw_data[yr][:5]:
        print(f"  Q{q['num']}: {q['stem'][:50]} | {q['ans']}")
