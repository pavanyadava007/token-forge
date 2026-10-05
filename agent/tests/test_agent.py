from tokenforge_agent import methods
from tokenforge_agent.corpus import KEEP, load
from tokenforge_agent.css import declarations, parses, replace_value
from tokenforge_agent.score import render, score_file
from tokenforge_agent.tokens import catalogue, color_distance, deprecated_map, parse_color

CSS = """.a__cancel {
  background: #ffffff;
  border-color: #cbd5e1;
}

.a__body {
  padding: 16px;
  font-size: 16px;
  line-height: 1.5;
}

.a__title {
  color: var(--tf-color-text-default);
}
"""


def test_parse_color_formats():
    assert parse_color("#fff") == (255, 255, 255)
    assert parse_color("rgb(37, 99, 235)") == parse_color("#2563EB")
    assert parse_color("var(--x)") is None
    assert color_distance((0, 0, 0), (3, 9, 1)) == 9


def test_declarations_and_replace_keep_layout():
    decls = declarations(CSS)
    assert [(d.selector, d.prop) for d in decls][:2] == [(".a__cancel", "background"), (".a__cancel", "border-color")]
    out = replace_value(CSS, decls[0].line, "var(--tf-color-action-secondary-bg)")
    assert out.count("\n") == CSS.count("\n")
    assert "background: var(--tf-color-action-secondary-bg);" in out
    assert parses(out)


def test_parses_rejects_broken_css():
    assert not parses(".a { color: #fff;")


def test_deprecated_map_points_at_semantic_tokens():
    for old, new in deprecated_map().items():
        assert catalogue()[old].tier == "deprecated"
        assert catalogue()[new].tier == "semantic"


def test_render_resolves_tokens_per_theme():
    assert render("var(--tf-color-surface-default)", "light") == "#ffffff"
    assert render("var(--tf-color-surface-default)", "dark") == "#020617"
    assert render("var(--tf-nope)", "dark") == "UNDEFINED"


def test_rules_codemod():
    out = methods.rules(CSS)
    d = {x.key: x.value for x in declarations(out)}
    assert d[(".a__body", "padding")] == "var(--tf-space-4)"
    assert d[(".a__body", "font-size")] == "var(--tf-font-size-md)"  # 16px decided by property, not value
    assert d[(".a__body", "line-height")] == "1.5"
    assert d[(".a__title", "color")] == "var(--tf-color-text-primary)"
    # plain codemod takes the first white token: page background, not the button
    assert d[(".a__cancel", "background")] == "var(--tf-color-surface-default)"
    assert methods.rules(CSS, plus=True).count("action-secondary-bg") == 1  # heuristic sees "cancel"


def test_scorer_oracle_and_noop_on_corpus():
    files, sites = load()
    fname = sorted(files)[0]
    ss = [s for s in sites if s.file == fname]
    noop = score_file(files[fname], files[fname], ss)
    assert sum(s["correct"] for s in noop["sites"]) == sum(1 for s in ss if s.expected == KEEP)
    out, idx = files[fname], {d.key: d.line for d in declarations(files[fname])}
    for s in ss:
        if s.expected != KEEP:
            out = replace_value(out, idx[(s.selector, s.prop)], s.expected)
    oracle = score_file(files[fname], out, ss)
    assert all(s["correct"] for s in oracle["sites"]) and oracle["collateral"] == 0


def test_agent_only_asks_llm_for_ties(monkeypatch):
    asked = []

    def fake_ask(text, fname, d, cands, seed, context):
        asked.append((d.selector, [c.name for c in cands]))
        return "tf-color-action-secondary-bg", 1, "secondary button"

    monkeypatch.setattr(methods, "ask", fake_ask)
    out = methods.agent(CSS, "a.css", seed=0)
    assert len(asked) == 1 and asked[0][0] == ".a__cancel"
    assert "tf-color-action-secondary-bg" in asked[0][1]
    assert "background: var(--tf-color-action-secondary-bg);" in out
    assert "border-color: var(--tf-color-action-secondary-border);" in out  # unique value, applied by rule
