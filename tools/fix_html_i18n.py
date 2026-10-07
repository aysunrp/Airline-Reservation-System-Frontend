# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8", errors="replace")
    orig = text
    text = re.sub(r'(\sdata-i18n="[^"]+")(?:\s*data-i18n="[^"]+")+', r"\1", text)
    text = text.replace(r"Don\'t have an account?", "Don't have an account?")
    text = text.replace("Don\\\\'t have an account?", "Don't have an account?")
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("fixed", path.name)

print("done")
