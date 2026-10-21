import json
import os
import re

out_dir = "jambprep/src/lib/dictionary"
os.makedirs(out_dir, exist_ok=True)

print("Starting generation of 300 items per game...")
