"""Apply AEROVA Horizon identity: recolor CSS, restyle fonts in HTML. Run from repo root."""
import os
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

HEX = [
    ("#101116", "#101614"),
    ("#0c0d11", "#0b100e"),
    ("#07111d", "#101614"),
    ("#050c16", "#0b100e"),
    ("#171719", "#141a18"),
    ("#202431", "#1a2320"),
    ("#151b29", "#151c1a"),
    ("#17243a", "#1a221f"),
    ("#122033", "#1a221f"),
    ("#f5eee9", "#f1eee6"),
    ("#faf7f4", "#faf8f3"),
    ("#f6f1e7", "#f1eee6"),
    ("#f4efe6", "#f1eee6"),
    ("#f3eee4", "#f1eee6"),
    ("#fffcf7", "#faf8f3"),
    ("#f0e8e2", "#e8e4da"),
    ("#e5d5cf", "#d9d3c7"),
    ("#e6dfd0", "#d9d3c7"),
    ("#c58e70", "#c45c32"),
    ("#d9a98f", "#e07a4a"),
    ("#c6a36a", "#c45c32"),
    ("#e0c48a", "#e07a4a"),
    ("#9a7b45", "#c45c32"),
    ("#641b30", "#1f5c56"),
    ("#8d3045", "#2a6f68"),
    ("#a94a61", "#4ea39a"),
    ("#7a2438", "#246862"),
]

RGB = [
    ("16, 17, 22", "16, 22, 20"),
    ("12, 13, 17", "11, 16, 14"),
    ("23, 36, 58", "26, 34, 31"),
    ("245, 238, 233", "241, 238, 230"),
    ("197, 142, 112", "196, 92, 50"),
    ("217, 169, 143", "224, 122, 74"),
    ("100, 27, 48", "31, 92, 86"),
    ("141, 48, 69", "42, 111, 104"),
    ("169, 74, 97", "78, 163, 154"),
    ("44, 46, 50", "26, 34, 31"),
]

FONT_CSS = [
    ('"Cormorant Garamond"', '"Fraunces"'),
    ('"Outfit"', '"Figtree"'),
]

FONT_HTML_FROM = "family=Cinzel:wght@500;600&family=Cormorant+Garamond:wght@500;600&family=Outfit:wght@300;400;500"
FONT_HTML_TO = "family=Cinzel:wght@500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Figtree:wght@300;400;500;600"

SKIP = {"theme.css"}


def rewrite(text):
    for a, b in HEX:
        text = re.sub(re.escape(a), b, text, flags=re.I)
    for a, b in RGB:
        text = text.replace(a, b)
    for a, b in FONT_CSS:
        text = text.replace(a, b)
    return text


def walk():
    n = 0
    for folder, _, files in os.walk(ROOT):
        if any(part in {".git", "node_modules", "__pycache__"} for part in folder.split(os.sep)):
            continue
        for name in files:
            path = os.path.join(folder, name)
            if name in SKIP:
                continue
            if name.endswith((".css", ".html", ".js")):
                raw = open(path, encoding="utf-8").read()
                out = rewrite(raw)
                if name.endswith(".html"):
                    out = out.replace(FONT_HTML_FROM, FONT_HTML_TO)
                if out != raw:
                    open(path, "w", encoding="utf-8", newline="\n").write(out)
                    n += 1
                    print("updated", os.path.relpath(path, ROOT))
    print("files:", n)


if __name__ == "__main__":
    walk()
