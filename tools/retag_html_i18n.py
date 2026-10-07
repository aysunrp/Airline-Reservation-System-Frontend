# -*- coding: utf-8 -*-
"""Aggressively tag remaining HTML visible text using EN locale reverse map."""
from pathlib import Path
import re
import json
from html import unescape

ROOT = Path(__file__).resolve().parents[1]
LOC = ROOT / "assets" / "js" / "locales"


def load_en():
    text = (LOC / "en.js").read_text(encoding="utf-8")
    m = re.search(r"window\.AEROVA_LOCALES\.en\s*=\s*(\{[\s\S]*\});\s*$", text)
    ns = {}
    exec("d = " + m.group(1), ns)
    return ns["d"]


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, p))
        else:
            out[p] = str(v)
    return out


SKIP_EXACT = {
    "AEROVA", "Aerova", "EN", "AZ", "RU", "CVV", "PNR", "Wi‑Fi", "Wi-Fi",
    "Apple Pay", "Google Pay", "Fast Track", "|", "—", "•", "/", "×", "→",
}


def normalize(s: str) -> str:
    s = unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_reverse(flat: dict) -> dict:
    rev = {}
    for key, val in flat.items():
        if "{" in val:  # skip interpolated templates for exact match
            continue
        n = normalize(val)
        if not n or n in SKIP_EXACT or len(n) < 2:
            continue
        # prefer shorter/more specific keys; keep first unless existing is common.*
        if n not in rev or rev[n].startswith("common."):
            rev[n] = key
    return rev


TEXT_TAGS = "h1|h2|h3|h4|h5|h6|p|button|a|label|span|li|th|td|option|legend|figcaption|dt|dd|strong|em|small"


def tag_file(path: Path, rev: dict) -> int:
    text = path.read_text(encoding="utf-8")
    count = 0

    def repl_text(m):
        nonlocal count
        tag, attrs, content = m.group(1), m.group(2) or "", m.group(3)
        if "data-i18n" in attrs:
            return m.group(0)
        # skip if only child whitespace / icons
        n = normalize(content)
        if not n or n in SKIP_EXACT:
            return m.group(0)
        if re.fullmatch(r"[\d\s\$€£.,:+\-–—/|%A-Z0-9]+", n):
            return m.group(0)
        key = rev.get(n)
        if not key:
            # try without trailing punctuation
            key = rev.get(n.rstrip(".:"))
        if not key:
            return m.group(0)
        # insert attribute
        if attrs.strip():
            new_attrs = attrs.rstrip() + f' data-i18n="{key}"'
        else:
            new_attrs = f' data-i18n="{key}"'
        count += 1
        return f"<{tag}{new_attrs}>{content}</{tag}>"

    pattern = re.compile(
        rf"<({TEXT_TAGS})(\s[^>]*)?>([^<]{{1,200}})</\1>",
        re.I,
    )
    text2 = pattern.sub(repl_text, text)

    # placeholders
    def repl_ph(m):
        nonlocal count
        before, ph, after = m.group(1), m.group(2), m.group(3)
        if "data-i18n-placeholder" in before or "data-i18n-placeholder" in after:
            return m.group(0)
        n = normalize(ph)
        key = rev.get(n)
        if not key:
            return m.group(0)
        count += 1
        return f'{before}placeholder="{ph}" data-i18n-placeholder="{key}"{after}'

    text2 = re.sub(
        r'(<[^>]*\s)placeholder="([^"]+)"([^>]*>)',
        repl_ph,
        text2,
    )

    # aria-label
    def repl_aria(m):
        nonlocal count
        before, aria, after = m.group(1), m.group(2), m.group(3)
        if "data-i18n-aria" in before or "data-i18n-aria" in after:
            return m.group(0)
        n = normalize(aria)
        key = rev.get(n)
        if not key:
            return m.group(0)
        count += 1
        return f'{before}aria-label="{aria}" data-i18n-aria="{key}"{after}'

    text2 = re.sub(
        r'(<[^>]*\s)aria-label="([^"]+)"([^>]*>)',
        repl_aria,
        text2,
    )

    if text2 != text:
        path.write_text(text2, encoding="utf-8")
    return count


def main():
    flat = flatten(load_en())
    rev = build_reverse(flat)
    print("reverse map size", len(rev))
    total = 0
    for path in sorted(ROOT.glob("*.html")):
        n = tag_file(path, rev)
        if n:
            print(f"tagged {n:3d}  {path.name}")
            total += n
    print("total new tags", total)


if __name__ == "__main__":
    main()
