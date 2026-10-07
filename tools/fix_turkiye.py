# -*- coding: utf-8 -*-
from pathlib import Path
import re

index = Path(__file__).resolve().parents[1] / "index.html"
raw = index.read_bytes()
# decode as utf-8
t = raw.decode("utf-8")
# replace any destination-location that ends with rkiye (possibly mojibaked)
t = re.sub(
    r'(<p class="destination-location">)\s*[^<]*rkiye\s*(</p>)',
    lambda m: m.group(1) + "T" + "\u00fcrkiye" + m.group(2),
    t,
    flags=re.I,
)
index.write_bytes(t.encode("utf-8"))
# verify
t2 = index.read_text(encoding="utf-8")
m = re.search(r'class="destination-location">([^<]+)</p>', t2)
# find istanbul one - 4th destination roughly
locs = re.findall(r'class="destination-location">([^<]+)</p>', t2)
Path("_locs.txt").write_text("\n".join(locs), encoding="utf-8")
print("locs written", len(locs))
