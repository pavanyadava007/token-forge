"""Deterministic generator for the migration benchmark.

Each file is a legacy consumer stylesheet (plain CSS or a Lit component) written before the token
system existed. Every declaration that should change, or must NOT change, is recorded with its
expected result. The light-theme hex values of several semantic tokens collide (white is page,
card and secondary-button background), so the right token often depends on context, not value.
"""

from __future__ import annotations

import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path

from .tokens import catalogue, deprecated_map, parse_color

OUT = Path(__file__).resolve().parents[1] / "corpus"
KEEP = "KEEP"

COMPONENTS = [
    "vehicle-card", "campaign-table", "login-form", "release-banner", "fleet-panel", "settings-dialog",
    "nav-drawer", "search-box", "trip-summary", "charging-map", "order-list", "profile-header",
    "service-booking", "dealer-finder", "news-teaser", "config-stepper", "price-box", "test-drive-form",
    "warranty-notice", "payment-sheet", "feature-grid", "media-gallery", "faq-accordion", "cookie-layer",
    "account-menu", "range-calculator", "spec-table", "video-hero", "footer-links", "status-timeline",
]  # fmt: skip

# role -> (selector options, [(property, token path), ...])
ROLES: dict[str, tuple[list[str], list[tuple[str, str]]]] = {
    "page": ([".{c}-page", ".{c}-layout", ".{c}-canvas", ".{c}-wrapper"], [("background", "color.surface.default")]),
    "raised": ([".{c}__panel", ".{c}__sheet", ".{c}__flyout", ".{c}-tile", ".{c}__card"], [("background", "color.surface.raised")]),
    "subtle": ([".{c}__row:nth-child(even)", ".{c}__section", ".{c}__header", ".{c}__well"], [("background", "color.surface.subtle")]),
    "inverse": ([".{c}__tooltip", ".{c}__bubble", ".{c}__toast"], [("background", "color.surface.inverse"), ("color", "color.text.inverse")]),
    "title": ([".{c}__title", ".{c} h2", ".{c}__name", ".{c}__label"], [("color", "color.text.primary")]),
    "meta": ([".{c}__meta", ".{c}__caption", ".{c}__timestamp", ".{c}__help"], [("color", "color.text.secondary")]),
    "link": ([".{c}__link", ".{c} a", ".{c}__more"], [("color", "color.text.link")]),
    "disabled": ([".{c}__item--disabled", ".{c}__option[aria-disabled='true']"], [("color", "color.text.disabled")]),
    "primary": ([".{c}__cta", ".{c}__save", ".{c}__confirm", ".{c} .primary"], [("background", "color.action.primary.bg"), ("color", "color.text.on-action")]),
    "primary_hover": ([".{c}__cta:hover", ".{c}__save:hover", ".{c}__confirm:hover"], [("background", "color.action.primary.bg-hover")]),
    "secondary": ([".{c}__cancel", ".{c}__secondary", ".{c}__back"], [("background", "color.action.secondary.bg"), ("border-color", "color.action.secondary.border")]),
    "divider": ([".{c}__divider", ".{c}__row", ".{c}__item"], [("border-color", "color.border.default")]),
    "field": ([".{c} input", ".{c}__field", ".{c} select"], [("border-color", "color.border.strong")]),
    "focus": ([".{c} input:focus-visible", ".{c}__field:focus", ".{c} button:focus-visible"], [("outline-color", "color.border.focus")]),
    "error": ([".{c}__error", ".{c}__alert--danger", ".{c}__problem"], [("color", "color.feedback.error.text"), ("background", "color.feedback.error.bg"), ("border-color", "color.feedback.error.border")]),
    "success": ([".{c}__success", ".{c}__done", ".{c}__saved"], [("color", "color.feedback.success.text"), ("background", "color.feedback.success.bg"), ("border-color", "color.feedback.success.border")]),
    "warning": ([".{c}__warning", ".{c}__caution", ".{c}__expiry"], [("color", "color.feedback.warning.text"), ("background", "color.feedback.warning.bg"), ("border-color", "color.feedback.warning.border")]),
    "info": ([".{c}__info", ".{c}__note", ".{c}__hint-box"], [("color", "color.feedback.info.text"), ("background", "color.feedback.info.bg"), ("border-color", "color.feedback.info.border")]),
}  # fmt: skip

DIMS = [
    ("padding", {"4px": "space.1", "8px": "space.2", "12px": "space.3", "16px": "space.4", "24px": "space.6"}),
    ("gap", {"4px": "space.1", "8px": "space.2", "16px": "space.4"}),
    ("margin-bottom", {"8px": "space.2", "16px": "space.4", "32px": "space.8"}),
    ("border-radius", {"4px": "radius.sm", "8px": "radius.md", "12px": "radius.lg"}),
    ("font-size", {"14px": "font.size.sm", "16px": "font.size.md", "20px": "font.size.lg"}),
]

# Declarations that must stay as they are. (selector, property, value, comment)
KEEPS = [
    (".{c}__logo path", "fill", "#e30613", "/* partner logo, fixed brand colour */"),
    (".{c}__qr", "background", "#ffffff", "/* QR codes need pure white in every theme */"),
    (".{c}__badge--beta", "color", "#7c3aed", ""),
    (".{c}__chart-line--3", "stroke", "#a855f7", ""),
    (".{c}__panel-shadow", "box-shadow", "0 1px 3px rgba(15, 23, 42, 0.12)", ""),
    (".{c}__avatar", "width", "40px", ""),
    (".{c}__body", "line-height", "1.5", ""),
    (".{c}__print-only", "color", "#000000", "/* print stylesheet, always black */"),
]


@dataclass
class Site:
    file: str
    selector: str
    prop: str
    original: str
    expected: str  # var(--tf-...) or KEEP
    kind: str  # exact | near | format | deprecated | dim | keep
    ambiguous: bool  # exact value matches 2+ tokens of the same category


def _var(path: str) -> str:
    return "var(--tf-" + path.replace(".", "-") + ")"


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{v:02x}" for v in rgb)


def _ambiguous(prop: str, value: str) -> bool:
    from .tokens import COLOR_PROPS, semantic

    cat = COLOR_PROPS.get(prop)
    rgb = parse_color(value)
    if not cat or not rgb:
        return False
    return sum(1 for t in semantic(cat) if parse_color(t.light) == rgb) >= 2


def _colour_value(rng: random.Random, path: str) -> tuple[str, str]:
    tok = catalogue()["tf-" + path.replace(".", "-")]
    old = {v: k for k, v in deprecated_map().items()}.get(tok.name)
    if old and rng.random() < 0.25:
        return f"var(--{old})", "deprecated"
    rgb = parse_color(tok.light)
    assert rgb
    r = rng.random()
    if r < 0.2:
        while True:
            delta = [rng.randint(-5, 5) for _ in range(3)]
            if any(delta):
                break
        return _hex(tuple(min(255, max(0, c + d)) for c, d in zip(rgb, delta, strict=True))), "near"
    if r < 0.32:
        return (f"rgb({rgb[0]}, {rgb[1]}, {rgb[2]})", "format")
    return tok.light, "exact"


def _render(name: str, rules: dict[str, list[tuple[str, str, str]]], lit: bool) -> str:
    body = []
    indent = "    " if lit else ""
    for sel, decls in rules.items():
        body.append(f"{indent}{sel} {{")
        for prop, value, comment in decls:
            body.append(f"{indent}  {prop}: {value};" + (f" {comment}" if comment else ""))
        body.append(f"{indent}}}")
        body.append("")
    css = "\n".join(body).rstrip() + "\n"
    if not lit:
        return f"/* {name}: legacy styles written before the token system */\n\n{css}"
    cls = "".join(p.capitalize() for p in name.split("-"))
    return (
        "import { LitElement, css, html } from 'lit';\n\n"
        f"// {name}: legacy component styles written before the token system\n"
        f"export class {cls} extends LitElement {{\n"
        f"  static styles = css`\n{css}  `;\n\n"
        f'  render() {{\n    return html`<div class="{name}"><slot></slot></div>`;\n  }}\n}}\n'
    )


def generate(n_css: int = 20, n_lit: int = 10, seed: int = 7) -> list[Site]:
    rng = random.Random(seed)
    sites: list[Site] = []
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*"):
        old.unlink()
    for i, comp in enumerate(COMPONENTS[: n_css + n_lit]):
        lit = i >= n_css
        fname = f"{comp}.{'ts' if lit else 'css'}"
        rules: dict[str, list[tuple[str, str, str]]] = {}
        used: set[tuple[str, str]] = set()

        def add(sel: str, prop: str, value: str, expected: str, kind: str, comment: str = "") -> None:
            if (sel, prop) in used:
                return
            used.add((sel, prop))
            rules.setdefault(sel, []).append((prop, value, comment))
            amb = kind in ("exact", "format") and _ambiguous(prop, value)
            sites.append(Site(fname, sel, prop, value, expected, kind, amb))

        for role in rng.sample(sorted(ROLES), k=rng.randint(6, 9)):
            selectors, props = ROLES[role]
            sel = rng.choice(selectors).format(c=comp)
            chosen = props if len(props) <= 2 else rng.sample(props, k=2)
            for prop, path in chosen:
                value, kind = _colour_value(rng, path)
                add(sel, prop, value, _var(path), kind)
        for prop, table in rng.sample(DIMS, k=rng.randint(2, 3)):
            value = rng.choice(sorted(table))
            add(
                f".{comp}__body" if prop != "border-radius" else f".{comp}__frame",
                prop,
                value,
                _var(table[value]),
                "dim",
            )
        for sel, prop, value, comment in rng.sample(KEEPS, k=rng.randint(1, 2)):
            add(sel.format(c=comp), prop, value, KEEP, "keep", comment)

        # Shuffle rule order so files do not all read the same way.
        items = list(rules.items())
        rng.shuffle(items)
        (OUT / fname).write_text(_render(comp, dict(items), lit))

    with (OUT / "ground_truth.jsonl").open("w") as f:
        for s in sites:
            f.write(json.dumps(asdict(s)) + "\n")
    return sites


def load() -> tuple[dict[str, str], list[Site]]:
    files = {p.name: p.read_text() for p in sorted(OUT.iterdir()) if p.suffix in (".css", ".ts")}
    sites = [Site(**json.loads(line)) for line in (OUT / "ground_truth.jsonl").read_text().splitlines()]
    return files, sites


def split(files: list[str], which: str) -> list[str]:
    """dev = every third file (used to tune prompts and heuristics), test = the rest, touched once."""
    ordered = sorted(files)
    dev = ordered[::3]
    return dev if which == "dev" else [f for f in ordered if f not in dev]


if __name__ == "__main__":
    s = generate()
    from collections import Counter

    print(len(s), "sites", Counter(x.kind for x in s), "ambiguous:", sum(x.ambiguous for x in s))
