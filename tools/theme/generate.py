"""Run: python tools/theme/generate.py (after any change to a page stylesheet, head.css or config.json).
Generates assets/css/theme.css: the Light and Dark overrides of the existing page stylesheets.
Every rule whose surface or text colour belongs to the other theme gets a counterpart under html[data-theme="..."]."""
import re, os, glob, colorsys, json, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CSS_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "assets", "css"))
OUT = os.path.join(CSS_DIR, "theme.css")
SKIP_FILES = {"theme.css"}
CFG = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
SKIP_SEL = re.compile(CFG["skip_selectors"], re.I) if CFG["skip_selectors"] else None
KEEP_FILES = set(CFG.get("keep_files", []))


# ---------------------------------------------------------------- css parsing
def strip_comments(s):
    return re.sub(r"/\*.*?\*/", "", s, flags=re.S)


def split_top(s, sep):
    out, depth, cur, q = [], 0, "", None
    for ch in s:
        if q:
            cur += ch
            if ch == q:
                q = None
            continue
        if ch in "\"'":
            q = ch
            cur += ch
            continue
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == sep and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return out


def parse(css):
    """-> list of nodes: ('rule', selector, [(prop, value)]) | ('at', prelude, children)"""
    css = strip_comments(css)
    pos = 0
    n = len(css)

    def block(start):
        nodes = []
        i = start
        while i < n:
            while i < n and css[i] in " \t\r\n":
                i += 1
            if i >= n or css[i] == "}":
                return nodes, i + 1
            # read prelude
            j = i
            q = None
            depth = 0
            while j < n:
                ch = css[j]
                if q:
                    if ch == q:
                        q = None
                elif ch in "\"'":
                    q = ch
                elif ch == "(":
                    depth += 1
                elif ch == ")":
                    depth -= 1
                elif depth == 0 and ch in "{;":
                    break
                j += 1
            prelude = css[i:j].strip()
            if j >= n:
                return nodes, n
            if css[j] == ";":
                nodes.append(("stmt", prelude))
                i = j + 1
                continue
            if prelude.startswith("@"):
                children, k = block(j + 1)
                nodes.append(("at", prelude, children))
                i = k
            else:
                # declarations until matching }
                k = j + 1
                depthb = 1
                q = None
                while k < n and depthb:
                    ch = css[k]
                    if q:
                        if ch == q:
                            q = None
                    elif ch in "\"'":
                        q = ch
                    elif ch == "{":
                        depthb += 1
                    elif ch == "}":
                        depthb -= 1
                    k += 1
                body = css[j + 1:k - 1]
                decls = []
                for part in split_top(body, ";"):
                    if ":" in part:
                        p, v = part.split(":", 1)
                        decls.append((p.strip(), v.strip()))
                nodes.append(("rule", prelude, decls))
                i = k
        return nodes, i

    nodes, _ = block(0)
    return nodes


# ---------------------------------------------------------------- colours
VARS = {}
NAMED = {"white": (255, 255, 255, 1.0), "black": (0, 0, 0, 1.0), "transparent": (0, 0, 0, 0.0)}

COLOR_RE = re.compile(
    r"#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^()]*\)|hsla?\([^()]*\)|var\(--[a-zA-Z0-9-]+(?:\s*,\s*[^()]*)?\)|\b(?:white|black|transparent)\b"
)


def parse_color(tok):
    tok = tok.strip()
    if tok.startswith("var("):
        name = re.match(r"var\((--[a-zA-Z0-9-]+)", tok).group(1)
        v = VARS.get(name)
        return parse_color(v) if v else None
    if tok in NAMED:
        return NAMED[tok]
    if tok.startswith("#"):
        h = tok[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        a = 1.0
        if len(h) == 8:
            a = int(h[6:], 16) / 255
            h = h[:6]
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
    m = re.match(r"rgba?\(([^)]*)\)", tok)
    if m:
        parts = re.split(r"[,\s/]+", m.group(1).strip())
        try:
            vals = [float(p.rstrip("%")) for p in parts[:3]]
            a = float(parts[3].rstrip("%")) / (100 if parts[3].endswith("%") else 1) if len(parts) > 3 else 1.0
        except ValueError:
            return None
        return (vals[0], vals[1], vals[2], a)
    return None


def hls(c):
    r, g, b = c[0] / 255, c[1] / 255, c[2] / 255
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, l, s


def to_css(rgb, a):
    r, g, b = (max(0, min(255, round(x))) for x in rgb)
    if a >= 0.995:
        return "#%02x%02x%02x" % (r, g, b)
    return "rgba(%d, %d, %d, %s)" % (r, g, b, ("%.2f" % a).rstrip("0").rstrip("."))


def family(c):
    h, l, s = hls(c)
    if c[3] == 0:
        return "none"
    if 28 <= h <= 52 and s > 0.38 and 0.3 < l < 0.82 and not (l > 0.8):
        return "gold"
    if l < 0.2 and (190 <= h <= 260 or s < 0.15):
        return "navy"
    if l < 0.2 and s < 0.5:
        return "navy"
    if l > 0.8:
        return "cream"
    if s < 0.16:
        return "grey"
    return "chroma"


# Light palette (anchors)
L = dict(bg=(246, 241, 231), surface=(255, 253, 248), alt=(243, 235, 224), sunken=(239, 230, 214), text=(28, 21, 12), gold_text=(125, 95, 39))
# Dark palette (anchors)
D = dict(bg=(7, 17, 29), surface=(16, 30, 48), alt=(11, 22, 36), sunken=(5, 12, 22), text=(246, 241, 231))


def navy_to_light(c):
    """a dark surface -> a light surface of the same depth"""
    _, l, _ = hls(c)
    if l < 0.03:
        base = L["sunken"]
    elif l < 0.055:
        base = L["bg"]
    elif l < 0.075:
        base = L["alt"]
    else:
        base = L["surface"]
    a = c[3]
    if a < 1:
        a = min(1.0, a + 0.3)
    return base, a


def cream_to_dark(c):
    _, l, _ = hls(c)
    if l >= 0.985:
        base = D["surface"]
    elif l >= 0.955:
        base = D["alt"]
    elif l >= 0.9:
        base = D["bg"]
    else:
        base = D["sunken"]
    a = c[3]
    if a < 1:
        a = max(0.04, a * 0.9)
    return base, a


def map_color(c, cls, target):
    """c = (r,g,b,a) of the other theme's source; returns css string or None when it stays"""
    fam = family(c)
    a = c[3]
    h, l, s = hls(c)
    if fam == "none":
        return None
    if target == "light":
        if fam == "navy":
            if cls == "bg":
                base, a2 = navy_to_light(c)
                return to_css(base, a2)
            if cls in ("border",):
                return None
            if cls == "shadow":
                return to_css((60, 40, 10), min(a * 0.38, 0.3))
            return None
        if fam == "cream":
            if cls in ("text", "fill"):
                return to_css(L["text"], min(1.0, a if a >= 0.995 else a * 1.12 + 0.05))
            if cls == "border":
                return to_css((70, 52, 22), min(0.4, a * 1.5 + 0.04))
            if cls == "shadow":
                return to_css((255, 255, 255), a)
            return None
        if fam == "gold":
            if cls in ("text", "fill"):
                return to_css(L["gold_text"], a)
            return None
        if fam == "grey":
            return None
        if fam == "chroma":
            if cls in ("text", "fill") and l > 0.55:
                r, g, b = colorsys.hls_to_rgb(h / 360, 0.3, min(1, s))
                return to_css((r * 255, g * 255, b * 255), a)
            if cls == "bg" and l < 0.4:
                r, g, b = colorsys.hls_to_rgb(h / 360, 0.93, min(1, s))
                return to_css((r * 255, g * 255, b * 255), min(1.0, a + 0.15))
            return None
    else:  # dark target
        if fam == "cream":
            if cls == "bg":
                base, a2 = cream_to_dark(c)
                return to_css(base, a2)
            if cls == "border":
                return None
            if cls == "shadow":
                return to_css((0, 0, 0), min(0.5, a))
            return None
        if fam == "navy":
            if cls in ("text", "fill"):
                return to_css(D["text"], min(1.0, a if a >= 0.995 else a * 0.95 + 0.04))
            if cls == "border":
                return to_css((246, 241, 231), max(0.1, min(0.4, a * 1.3)))
            return None
        if fam == "grey":
            if cls in ("text", "fill") and l < 0.6:
                return to_css((246, 241, 231), 0.72)
            if cls == "border" and l < 0.6:
                return to_css((246, 241, 231), 0.18)
            return None
        if fam == "gold":
            if cls in ("text", "fill") and l < 0.5:
                return to_css((224, 196, 138), a)
            return None
        if fam == "chroma":
            if cls in ("text", "fill") and l < 0.5:
                r, g, b = colorsys.hls_to_rgb(h / 360, 0.74, min(1, s))
                return to_css((r * 255, g * 255, b * 255), a)
            if cls == "bg" and l > 0.8:
                r, g, b = colorsys.hls_to_rgb(h / 360, 0.17, min(1, s))
                return to_css((r * 255, g * 255, b * 255), a)
            return None
    return None


TEXT_PROPS = {"color", "fill", "stroke", "caret-color", "-webkit-text-fill-color", "text-decoration-color", "accent-color", "-webkit-text-stroke-color"}
BORDER_PROPS = re.compile(r"^(border(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-color)?|outline(-color)?|column-rule(-color)?)$")


def prop_class(p):
    p = p.lower()
    if p in ("background", "background-color", "background-image"):
        return "bg"
    if p in TEXT_PROPS:
        return "text" if p != "fill" and p != "stroke" else "fill"
    if BORDER_PROPS.match(p):
        return "border"
    if p in ("box-shadow", "text-shadow", "filter", "drop-shadow"):
        return "shadow"
    return None


def decl_colors(prop, value):
    return [(m.group(0), parse_color(m.group(0))) for m in COLOR_RE.finditer(value)]


def surface_kind(decls):
    """'dark' | 'light' | None : of the background of this rule"""
    lums = []
    for p, v in decls:
        if p.lower() in ("background", "background-color", "background-image") and "url(" not in v:
            for tok, c in decl_colors(p, v):
                if c and c[3] >= 0.35:
                    fam = family(c)
                    if fam == "navy":
                        lums.append("dark")
                    elif fam == "cream":
                        lums.append("light")
    if lums:
        return "dark" if lums.count("dark") >= lums.count("light") else "light"
    return None


def text_kind(decls):
    for p, v in decls:
        if p.lower() == "color":
            for tok, c in decl_colors(p, v):
                if c:
                    fam = family(c)
                    h, l, s_ = hls(c)
                    if fam == "cream":
                        return "light"
                    if fam == "navy":
                        return "dark"
                    if fam in ("grey", "chroma") and l < 0.45:
                        return "dark"
                    if fam in ("grey", "chroma") and l > 0.62:
                        return "light"
    return None


ANCH = {
    "light": {"#f6f1e7": "var(--color-background)", "#fffdf8": "var(--color-surface)", "#f3ebe0": "var(--color-surface-alt)", "#efe6d6": "var(--color-surface-sunken)", "#1c150c": "var(--color-text)", "#7d5f27": "var(--color-accent-strong)"},
    "dark": {"#07111d": "var(--color-background)", "#101e30": "var(--color-surface)", "#0b1624": "var(--color-surface-alt)", "#050c16": "var(--color-surface-sunken)", "#f6f1e7": "var(--color-text)"},
}


def rewrite_value(prop, value, cls, target):
    out = value
    changed = False

    def repl(m):
        nonlocal changed
        c = parse_color(m.group(0))
        if not c:
            return m.group(0)
        new = map_color(c, cls, target)
        if new:
            changed = True
            return ANCH[target].get(new, new)
        return m.group(0)

    out = COLOR_RE.sub(repl, value)
    return out, changed


def should_flip(selector, decls, target):
    if SKIP_SEL and SKIP_SEL.search(selector):
        return False
    bg = surface_kind(decls)
    tx = text_kind(decls)
    if any("url(" in v for p, v in decls if p.lower().startswith("background")):
        return False
    # a gold button keeps the ink of its label in both themes
    for p, v in decls:
        if p.lower().startswith("background"):
            for tok, c in decl_colors(p, v):
                if c and c[3] >= 0.5 and family(c) == "gold":
                    return False
    if target == "light":
        if bg == "dark":
            return True
        if bg is None and tx == "light":
            return True
        return False
    if bg == "light":
        return True
    if bg is None and tx == "dark":
        return True
    return False


def border_only_flip(selector, decls, target):
    """rules that only carry a border/shadow of the other theme"""
    if SKIP_SEL and SKIP_SEL.search(selector):
        return False
    if surface_kind(decls) or text_kind(decls):
        return False
    return any(prop_class(p) in ("border", "shadow", "fill") for p, v in decls)


BG_TEXT = re.compile(r"(?<![a-z])(bar|line|icon|dot|divider|separator|arrow|chevron|caret|tick|check|stroke)(?![a-z])", re.I)


def bg_as_ink(selector, decls, target):
    """a thin bar / dot drawn with a background colour is ink, not a surface"""
    if SKIP_SEL and SKIP_SEL.search(selector) or not BG_TEXT.search(selector):
        return None
    res = []
    for p, v in decls:
        if p.lower() in ("background", "background-color") and "gradient" not in v and "url(" not in v:
            for tok, c in decl_colors(p, v):
                if not c:
                    continue
                fam = family(c)
                if target == "light" and fam == "cream":
                    res.append((p, ANCH["light"].get(to_css(L["text"], c[3]), to_css(L["text"], c[3]))))
                elif target == "dark" and fam == "navy" and c[3] > 0.5:
                    res.append((p, ANCH["dark"].get(to_css(D["text"], c[3]), to_css(D["text"], c[3]))))
                break
    return res or None


def flip_rule(selector, decls, target, force=False):
    ink = bg_as_ink(selector, decls, target)
    if ink:
        return ink
    new = []
    flip_all = force or should_flip(selector, decls, target)
    only = (not flip_all) and border_only_flip(selector, decls, target)
    if not (flip_all or only):
        return gold_text_only(selector, decls, target)
    for p, v in decls:
        cls = prop_class(p)
        if not cls:
            continue
        if only and cls not in ("border", "shadow", "fill"):
            continue
        # a gold button / badge keeps its own text colour: only flip text of a rule that sits on its own surface or is plain text
        nv, ch = rewrite_value(p, v, cls, target)
        if ch:
            new.append((p, nv))
    return new or None


def gold_text_only(selector, decls, target):
    """light theme: the pale gold of a plain text rule is too faint on cream"""
    if target != "light" or (SKIP_SEL and SKIP_SEL.search(selector)):
        return None
    for p, v in decls:
        if p.lower().startswith("background") and any(c and family(c) == "gold" for _, c in decl_colors(p, v)):
            return None
        if p.lower().startswith("background") and "url(" in v:
            return None
    res = []
    for p, v in decls:
        if p.lower() == "color":
            for tok, c in decl_colors(p, v):
                if c and family(c) == "gold" and hls(c)[1] > 0.45:
                    res.append((p, ANCH["light"].get(to_css(L["gold_text"], c[3]), to_css(L["gold_text"], c[3]))))
                    break
    return res or None


def prefix_selector(sel, target):
    pre = 'html[data-theme="%s"]' % target
    parts = split_top(sel, ",")
    out = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.startswith(":root"):
            part = pre + part[5:]
        elif part == "html" or part.startswith("html ") or part.startswith("html."):
            part = pre + part[4:]
        else:
            part = pre + " " + part
        out.append(part)
    return ",\n".join(out)


def emit(nodes, target, indent=""):
    out = []
    for node in nodes:
        if node[0] == "rule":
            _, sel, decls = node
            if sel.startswith("@") or not decls:
                continue
            res = flip_rule(sel, decls, target)
            if res:
                body = "\n".join("%s    %s: %s;" % (indent, p, v) for p, v in res)
                out.append("%s%s {\n%s\n%s}" % (indent, prefix_selector(sel, target).replace("\n", "\n" + indent), body, indent))
        elif node[0] == "at":
            _, prelude, children = node
            name = prelude.split()[0].lower()
            if name in ("@font-face", "@keyframes", "@-webkit-keyframes", "@page"):
                continue
            inner = emit(children, target, indent + "    ")
            if inner:
                out.append("%s%s {\n%s\n%s}" % (indent, prelude, "\n\n".join(inner), indent))
    return out


def collect_vars(nodes):
    for node in nodes:
        if node[0] == "rule" and not node[1].startswith("@"):
            for p, v in node[2]:
                if p.startswith("--") and p not in VARS:
                    VARS[p] = v
        elif node[0] == "at":
            collect_vars(node[2])


def main():
    files = [f for f in sorted(glob.glob(os.path.join(CSS_DIR, "*.css"))) if os.path.basename(f) not in SKIP_FILES]
    trees = {}
    for f in files:
        trees[f] = parse(open(f, encoding="utf-8").read())
        collect_vars(trees[f])
    # gold in the stylesheets is written both as var(...) and literal; keep the variables resolvable
    blocks = []
    stats = {}
    for target in ("light", "dark"):
        for f in files:
            base = os.path.basename(f)
            if base in KEEP_FILES:
                continue
            chunk = emit(trees[f], target)
            if chunk:
                stats[(target, base)] = len(chunk)
                blocks.append("/* ---- %s: %s ---- */\n%s" % (target, base, "\n\n".join(chunk)))
    head = open(os.path.join(HERE, "head.css"), encoding="utf-8").read()
    open(OUT, "w", encoding="utf-8", newline="\n").write(head + "\n\n" + "\n\n".join(blocks) + "\n")
    tot = sum(stats.values())
    print("rules emitted:", tot)
    for k, v in sorted(stats.items(), key=lambda kv: -kv[1])[:12]:
        print("  ", k, v)


if __name__ == "__main__":
    main()
