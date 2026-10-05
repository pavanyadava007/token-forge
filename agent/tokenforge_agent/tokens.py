"""Token catalogue loaded from the Style Dictionary build (dist/json) and the DTCG source."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Which semantic colour tokens fit which CSS property. A codemod and the agent both use this.
COLOR_PROPS = {
    "color": "fg",
    "background": "bg",
    "background-color": "bg",
    "border-color": "border",
    "outline-color": "border",
}
DIM_PROPS = {
    "padding": "space",
    "padding-top": "space",
    "padding-bottom": "space",
    "padding-left": "space",
    "padding-right": "space",
    "margin": "space",
    "margin-top": "space",
    "margin-bottom": "space",
    "gap": "space",
    "row-gap": "space",
    "column-gap": "space",
    "border-radius": "radius",
    "font-size": "font.size",
}


@dataclass(frozen=True)
class Token:
    name: str  # CSS variable name without "--", e.g. tf-color-text-primary
    path: str  # e.g. color.text.primary
    light: str
    dark: str
    tier: str
    description: str = ""

    @property
    def var(self) -> str:
        return f"var(--{self.name})"

    @property
    def category(self) -> str | None:
        p = self.path
        if not p.startswith("color.") or self.tier != "semantic":
            for prefix in ("space", "radius", "font.size"):
                if p.startswith(prefix + "."):
                    return prefix
            return None
        if p.startswith("color.text.") or p.endswith(".text"):
            return "fg"
        if p.startswith("color.border.") or p.endswith(".border"):
            return "border"
        return "bg"


@cache
def catalogue() -> dict[str, Token]:
    light = json.loads((ROOT / "dist/json/light.json").read_text())
    dark = json.loads((ROOT / "dist/json/dark.json").read_text())
    out = {}
    for name, t in light.items():
        out[name] = Token(
            name=name,
            path=t["path"],
            light=str(t["value"]).lower(),
            dark=str(dark.get(name, t)["value"]).lower(),
            tier=t["tier"],
            description=t.get("description", ""),
        )
    return out


def semantic(category: str | None = None) -> list[Token]:
    return [
        t
        for t in catalogue().values()
        if (t.tier == "semantic" or (t.category in ("space", "radius", "font.size")))
        and t.category is not None
        and (category is None or t.category == category)
    ]


@cache
def deprecated_map() -> dict[str, str]:
    """Old CSS variable name -> new CSS variable name, from tokens/deprecated.json."""
    src = json.loads((ROOT / "tokens/deprecated.json").read_text())
    out: dict[str, str] = {}

    def walk(node: dict, path: list[str]) -> None:
        for k, v in node.items():
            if k.startswith("$"):
                continue
            if isinstance(v, dict) and "$value" in v:
                target = v["$value"].strip("{}")
                out["tf-" + "-".join([*path, k])] = "tf-" + target.replace(".", "-")
            elif isinstance(v, dict):
                walk(v, [*path, k])

    walk(src, [])
    return out


_HEX = re.compile(r"^#([0-9a-f]{3}|[0-9a-f]{6})$", re.I)
_RGB = re.compile(r"^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$", re.I)


def parse_color(value: str) -> tuple[int, int, int] | None:
    v = value.strip().lower()
    if m := _HEX.match(v):
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if m := _RGB.match(v):
        return tuple(int(x) for x in m.groups())  # type: ignore[return-value]
    return None


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return max(abs(x - y) for x, y in zip(a, b, strict=True))
