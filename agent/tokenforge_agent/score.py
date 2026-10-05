"""Scores one rewritten file against the ground truth for that file."""

from __future__ import annotations

from .corpus import KEEP, Site
from .css import declarations, parses
from .tokens import catalogue, parse_color


def _norm(v: str) -> str:
    return " ".join(v.strip().lower().split())


def render(value: str, theme: str) -> str:
    """What the browser would paint for this value in a theme (token vars resolved)."""
    v = _norm(value)
    if v.startswith("var(--") and v.endswith(")"):
        tok = catalogue().get(v[6:-1].split(",")[0].strip())
        if tok is None:
            return "UNDEFINED"
        return getattr(tok, theme)
    if (rgb := parse_color(v)) is not None:
        return "#" + "".join(f"{c:02x}" for c in rgb)
    return v


def score_file(original: str, output: str, sites: list[Site]) -> dict:
    out = {d.key: d.value for d in declarations(output)}
    orig = {d.key: d.value for d in declarations(original)}
    site_keys = {(s.selector, s.prop) for s in sites}
    results = []
    for s in sites:
        got = out.get((s.selector, s.prop))
        target = s.original if s.expected == KEEP else s.expected
        if got is None:
            results.append(
                {
                    "kind": s.kind,
                    "ambiguous": s.ambiguous,
                    "correct": False,
                    "missing": True,
                    "light_err": True,
                    "dark_err": True,
                    "got": None,
                    "expected": s.expected,
                }
            )
            continue
        results.append(
            {
                "kind": s.kind,
                "ambiguous": s.ambiguous,
                "correct": _norm(got) == _norm(target),
                "missing": False,
                "light_err": render(got, "light") != render(target, "light"),
                "dark_err": render(got, "dark") != render(target, "dark"),
                "got": got,
                "expected": s.expected,
            }
        )
    collateral = sum(1 for k, v in orig.items() if k not in site_keys and _norm(out.get(k, "")) != _norm(v))
    collateral += sum(1 for k in out if k not in orig)
    return {"sites": results, "collateral": collateral, "parses": parses(output)}
