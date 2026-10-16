import json

with open('jambprep/scripts/phe-parsed-raw.json') as f:
    raw_data = json.load(f)

print("Loaded years:", list(raw_data.keys()))
