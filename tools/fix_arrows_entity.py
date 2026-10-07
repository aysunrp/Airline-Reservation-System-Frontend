# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    # Replace arrow glyphs in decorative spans with HTML entity
    text = re.sub(
        r'(class="[^"]*arrow[^"]*"[^>]*>)\s*(?:→|â†’|\?|&rarr;)\s*(</span>)',
        r"\1&rarr;\2",
        text,
    )
    # also any remaining literal → next to Book Now etc inside arrow spans
    text = text.replace("â†’", "&rarr;")
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("fixed", path.name)

# ensure charset meta early in all pages
for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    if 'charset="UTF-8"' not in text and "charset=UTF-8" not in text:
        text = text.replace("<head>", '<head>\n    <meta charset="UTF-8">', 1)
        path.write_text(text, encoding="utf-8")
        print("charset", path.name)
print("done")
