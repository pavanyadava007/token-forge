"""Three ways to migrate a legacy file to tokens.

rules        exact-value codemod, first matching token wins (what a quick script does)
rules_plus   + near-miss colours (max channel diff <= 8) + selector keyword heuristics for ties
llm_file     the LLM rewrites the whole file from the token table
agent        deterministic locator + rules for the unambiguous cases; the LLM only picks among
             candidate tokens (or KEEP) where value alone cannot decide; edits are applied by line,
             so nothing else in the file can change
"""

from __future__ import annotations

import json
import re

from .css import Decl, declarations, replace_value
from .llm import chat
from .tokens import COLOR_PROPS, DIM_PROPS, Token, catalogue, color_distance, deprecated_map, parse_color, semantic

NEAR = 8
_PX = re.compile(r"^\d+px$")

# Written before any evaluation run; used only to break ties between tokens with the same value.
HEURISTICS: list[tuple[tuple[str, ...], dict[str, str]]] = [
    (("tooltip", "toast", "snackbar"), {"bg": "color.surface.inverse", "fg": "color.text.inverse"}),
    (
        ("secondary", "cancel", "outline"),
        {"bg": "color.action.secondary.bg", "border": "color.action.secondary.border"},
    ),
    (("btn", "button", "cta", "primary", "submit"), {"bg": "color.action.primary.bg", "fg": "color.text.on-action"}),
    (("focus",), {"border": "color.border.focus"}),
    (("card", "tile", "panel", "dialog", "modal", "popover", "menu", "dropdown"), {"bg": "color.surface.raised"}),
    (("page", "app", "layout", "shell", "root"), {"bg": "color.surface.default"}),
    (("link",), {"fg": "color.text.link"}),
    (("error", "danger"), {"fg": "color.feedback.error.text", "border": "color.feedback.error.border"}),
    (("info", "notice"), {"fg": "color.feedback.info.text", "border": "color.feedback.info.border"}),
]


def _name(path: str) -> str:
    return "tf-" + path.replace(".", "-")


def is_candidate(d: Decl) -> bool:
    if d.value.startswith("var(--tf-"):
        return True
    if d.prop in COLOR_PROPS and parse_color(d.value):
        return True
    return d.prop in DIM_PROPS and bool(_PX.match(d.value))


def colour_candidates(d: Decl, near: bool, spread: bool = False) -> tuple[list[Token], bool]:
    """Tokens of the property's category with the same light value, or, if near, a close one.

    spread=False keeps only the closest tokens (codemod behaviour); spread=True keeps every token within
    NEAR, closest first, so a reviewer can still pick the right one when drift moved the value toward another.
    """
    rgb = parse_color(d.value)
    cat = COLOR_PROPS.get(d.prop)
    if not rgb or not cat:
        return [], False
    pool = semantic(cat)
    exact = [t for t in pool if parse_color(t.light) == rgb]
    if exact or not near:
        return exact, True
    dists = sorted(((color_distance(parse_color(t.light), rgb), i, t) for i, t in enumerate(pool)))  # type: ignore[arg-type]
    best = dists[0][0]
    if best > NEAR:
        return [], False
    return [t for dist, _, t in dists if (dist <= NEAR if spread else dist == best)], False


def dim_choice(d: Decl) -> Token | None:
    cat = DIM_PROPS.get(d.prop)
    matches = [t for t in semantic(cat) if t.light == d.value] if cat else []
    return matches[0] if len(matches) == 1 else None


def heuristic_pick(d: Decl, cands: list[Token]) -> Token:
    names = {t.name for t in cands}
    sel = d.selector.lower()
    cat = COLOR_PROPS[d.prop]
    if ":hover" in sel and cat == "bg" and _name("color.action.primary.bg-hover") in names:
        return catalogue()[_name("color.action.primary.bg-hover")]
    for words, mapping in HEURISTICS:
        if any(w in sel for w in words) and (path := mapping.get(cat)) and _name(path) in names:
            return catalogue()[_name(path)]
    return cands[0]


def rules(text: str, plus: bool = False) -> str:
    for d in declarations(text):
        if not is_candidate(d):
            continue
        new: Token | None = None
        if d.value.startswith("var(--tf-"):
            old = d.value[6:-1]
            if old in deprecated_map():
                new = catalogue()[deprecated_map()[old]]
        elif d.prop in DIM_PROPS:
            new = dim_choice(d)
        else:
            cands, _ = colour_candidates(d, near=plus)
            if cands:
                new = heuristic_pick(d, cands) if plus else cands[0]
        if new:
            text = replace_value(text, d.line, new.var)
    return text


# ---------------------------------------------------------------- LLM whole-file rewrite

FILE_SYSTEM = (
    "You migrate legacy stylesheets to a design-token system. Replace hard-coded colours and sizes with the "
    "semantic token that matches the PURPOSE of the declaration (read the selector), and replace deprecated "
    "token variables with their new names. Several tokens share a light-theme value but differ in dark theme, "
    "so choose by meaning, not by value. Leave a value as it is when it must look identical in every theme or is "
    "not a design decision (logos, charts, shadows, layout sizes, values with no fitting token). Change only "
    "declaration values; keep every selector, declaration, comment and line in place."
)


def token_table() -> str:
    lines = ["Semantic colour tokens (CSS variable | light | dark | use):"]
    for t in semantic():
        if t.path.startswith("color."):
            lines.append(f"--{t.name} | {t.light} | {t.dark} | {t.description}")
    lines.append("\nSize tokens (CSS variable | value):")
    for t in semantic():
        if not t.path.startswith("color."):
            lines.append(f"--{t.name} | {t.light}")
    lines.append("\nDeprecated variables (old -> new):")
    for old, new in deprecated_map().items():
        lines.append(f"--{old} -> --{new}")
    lines.append("\nUse tokens as var(--name).")
    return "\n".join(lines)


def _code_block(reply: str) -> str | None:
    blocks = re.findall(r"```[a-zA-Z]*\n(.*?)```", reply, re.S)
    return max(blocks, key=len) if blocks else None


def llm_file(text: str, fname: str, seed: int) -> str:
    reply = chat(
        [
            {"role": "system", "content": FILE_SYSTEM},
            {
                "role": "user",
                "content": f"{token_table()}\n\nFile `{fname}`:\n```\n{text}```\n\n"
                "Return the complete migrated file in one fenced code block.",
            },
        ],
        seed=seed,
    )
    return _code_block(reply) or text


# ---------------------------------------------------------------- agent

# v1 (first dev run, kept for the record): choose by meaning, KEEP when nothing fits.
# v2: name the UI element first, and treat small value differences as legacy drift, not as "no fit".
SITE_SYSTEM = (
    "You migrate one CSS declaration from a legacy stylesheet to a design-token system. "
    "Step 1: from the file name and selector, say what UI element the rule styles (for example page, card, "
    "secondary button, info message, tooltip, form field) and what the property does on it. "
    "Step 2: pick the option whose stated use matches that element and property. Several tokens share a "
    "light-theme value but differ in dark theme, so decide by meaning, not by value. Legacy values often drift a "
    "few units from the design value (e.g. #fcfeff instead of #ffffff); that is not a reason to keep them. "
    "Choose KEEP only when the value must stay identical in every theme (a comment may say so) or no option "
    'fits the element. Answer with JSON: {"element": "<step 1>", "choice": "<option name>"}.'
)


def _rule_block(text: str, d: Decl) -> str:
    decls = [x for x in declarations(text) if x.selector == d.selector]
    body = "\n".join(f"  {x.prop}: {x.value};" + (f" {x.comment}" if x.comment else "") for x in decls)
    return f"{d.selector} {{\n{body}\n}}"


def ask(text: str, fname: str, d: Decl, cands: list[Token], seed: int, context: bool) -> tuple[str, int, str]:
    """Returns (choice, attempts, element). choice is a CSS variable name or 'KEEP'."""
    opts = "\n".join(f"- {t.name}: light {t.light}, dark {t.dark}. {t.description}" for t in cands)
    opts += "\n- KEEP: leave the literal value unchanged."
    where = (
        f"File: {fname}\nRule:\n{_rule_block(text, d)}\n\nDeclaration to migrate: `{d.prop}: {d.value};`"
        + (f" {d.comment}" if d.comment else "")
        if context
        else f"Declaration to migrate: `{d.prop}: {d.value};`"
    )
    valid = {t.name for t in cands} | {"KEEP"}
    messages = [{"role": "system", "content": SITE_SYSTEM}, {"role": "user", "content": f"{where}\n\nOptions:\n{opts}"}]
    for attempt in (1, 2):
        reply = chat(messages, seed=seed + 1000 * (attempt - 1), json_mode=True)
        try:
            parsed = json.loads(reply)
            choice = str(parsed.get("choice", "")).strip().removeprefix("--")
            element = str(parsed.get("element", ""))
        except (json.JSONDecodeError, AttributeError):
            choice, element = "", ""
        if choice in valid:
            return choice, attempt, element
        messages += [
            {"role": "assistant", "content": reply},
            {"role": "user", "content": f"Invalid choice. Answer with one of: {', '.join(sorted(valid))}."},
        ]
    return "KEEP", 2, ""


def agent(text: str, fname: str, seed: int, context: bool = True, log: list | None = None) -> str:
    original = text
    for d in declarations(original):
        if not is_candidate(d):
            continue
        new: str | None = None
        if d.value.startswith("var(--tf-"):
            old = d.value[6:-1]
            new = catalogue()[deprecated_map()[old]].var if old in deprecated_map() else None
        elif d.prop in DIM_PROPS:
            t = dim_choice(d)
            new = t.var if t else None
        else:
            cands, _ = colour_candidates(d, near=True, spread=True)
            if len(cands) == 1 and not d.comment:
                new = cands[0].var
            elif cands:
                choice, attempts, element = ask(original, fname, d, cands, seed, context)
                new = None if choice == "KEEP" else catalogue()[choice].var
                if log is not None:
                    log.append(
                        {
                            "selector": d.selector,
                            "prop": d.prop,
                            "value": d.value,
                            "choice": choice,
                            "element": element,
                            "attempts": attempts,
                            "n_candidates": len(cands),
                        }
                    )
        if new:
            text = replace_value(text, d.line, new)
    return text
