"""Line-level CSS declaration finder used by the methods (to locate candidates) and the scorer.

Consumer files keep one declaration per line, so a line parser is enough and keeps spans exact.
It also works on Lit files, where the CSS sits inside a css`...` template.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import tinycss2

_OPEN = re.compile(r"^\s*([^{};]+?)\s*\{\s*$")
_DECL = re.compile(r"^(\s*)([a-z-]+)(\s*:\s*)(.+?)(\s*;)(\s*/\*.*\*/)?\s*$")


@dataclass(frozen=True)
class Decl:
    line: int  # 0-based
    selector: str
    prop: str
    value: str
    comment: str

    @property
    def key(self) -> tuple[str, str]:
        return (self.selector, self.prop)


def declarations(text: str) -> list[Decl]:
    out: list[Decl] = []
    stack: list[str] = []
    for i, line in enumerate(text.splitlines()):
        if m := _OPEN.match(line):
            stack.append(m.group(1).strip())
            continue
        if line.strip().startswith("}"):
            if stack:
                stack.pop()
            continue
        if stack and (m := _DECL.match(line)):
            out.append(Decl(i, stack[-1], m.group(2), m.group(4).strip(), (m.group(6) or "").strip()))
    return out


def replace_value(text: str, line: int, new_value: str) -> str:
    lines = text.splitlines(keepends=True)
    m = _DECL.match(lines[line].rstrip("\n"))
    if not m:
        raise ValueError(f"line {line} is not a declaration")
    nl = "\n" if lines[line].endswith("\n") else ""
    lines[line] = f"{m.group(1)}{m.group(2)}{m.group(3)}{new_value}{m.group(5)}{m.group(6) or ''}{nl}"
    return "".join(lines)


def css_body(text: str) -> str:
    """The stylesheet part of a file: whole file for .css, the css`...` block for Lit."""
    if "css`" in text:
        start = text.index("css`") + 4
        return text[start : text.index("`", start)]
    return text


def parses(text: str) -> bool:
    body = css_body(text)
    if body.count("{") != body.count("}"):
        return False
    rules = tinycss2.parse_stylesheet(body, skip_whitespace=True, skip_comments=True)
    if any(r.type == "error" for r in rules):
        return False
    for r in rules:
        if r.type == "qualified-rule":
            decls = tinycss2.parse_declaration_list(r.content, skip_whitespace=True, skip_comments=True)
            if any(d.type == "error" for d in decls):
                return False
    return True
