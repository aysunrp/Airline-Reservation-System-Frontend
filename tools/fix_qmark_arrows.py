# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
index = ROOT / "index.html"
t = index.read_text(encoding="utf-8")

for cls in ("hero-cta-arrow", "why-aerova-card-arrow", "premium-experience-link-arrow"):
    t = re.sub(rf'(class="{cls}"[^>]*>).(?=</span>)', r"\1→", t)

# any remaining ? in aria-hidden single char
t = re.sub(r'(aria-hidden="true">)\?(</span>)', r"\1→\2", t)

index.write_text(t, encoding="utf-8")
Path("_arrow_check.txt").write_text(
    "\n".join(re.findall(r'class="[^"]*arrow[^"]*"[^>]*>.</span>', t)),
    encoding="utf-8",
)
print("done")
