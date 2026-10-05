# token-forge

One design-token source, many outputs, and an LLM agent that moves legacy CSS onto the tokens without breaking dark mode.

- **Tokens:** W3C DTCG JSON in three layers (primitive palette, semantic light/dark themes, deprecated aliases) built with **Style Dictionary 5** into CSS custom properties per theme, a **Tailwind v4 `@theme`**, typed ES modules and a flat JSON for tooling.
- **Checks on every build:** theme parity, semantic tokens must reference primitives, deprecated aliases must point at live tokens, and 32 **WCAG 2.2 contrast pairs** in both themes.
- **Component library:** four **Lit web components** (`tf-button`, `tf-input`, `tf-card`, `tf-alert`) that may only use semantic tokens (a unit test enforces it). `tf-input` is form-associated through `ElementInternals`. Documented in **Storybook 10** with a light/dark toolbar.
- **Tests:** Vitest for the token tooling, Playwright + **axe (WCAG 2.2 AA)** on every story in both themes, keyboard/form/ARIA behaviour tests, and visual snapshots taken in the pinned Playwright container so they match in CI.
- **Change automation:** a GitHub Action builds the tokens of the PR base and head, posts a release plan (semver bump + every added, changed, deprecated or removed token) as a PR comment, and fails when a token is removed without a deprecation period.
- **Migration agent:** rewrites hard-coded colours, sizes and deprecated token names in consumer code (plain CSS and Lit) to semantic tokens. Measured below against two codemods and a whole-file LLM rewrite.

Demo (static, Hugging Face Space): https://huggingface.co/spaces/pavanyadava07/token-forge

## Why the agent exists

Several semantic tokens share a light-theme value. White is the page background, the card background and the secondary-button background; one blue is both the focus ring and the info-message border. A codemod that maps values to tokens therefore produces CSS that looks right in light mode and paints the wrong colour in dark mode. Picking the right token needs the selector and the file, which is what the agent gives an LLM, and only for the declarations where value alone cannot decide.

```
legacy file ──> locator (line parser, exact spans)
                 ├─ deprecated var()        -> rename map            (deterministic)
                 ├─ px size + property       -> space/radius/font    (deterministic)
                 ├─ colour, one candidate    -> that token           (deterministic)
                 └─ colour, tie or comment   -> LLM picks one candidate or KEEP (JSON, validated, 1 retry)
              -> edits applied by line: selectors, comments and every other line cannot change
```

## Results

<!-- results:start -->
Qwen3-Coder 30B (Q4_K_M) via Ollama on one NVIDIA L4, temperature 0.3, seeds 0 1 2 (codemods are deterministic, one run). Mean over seeds, ± population sd.

### test split (292 graded declarations)

| Method | Correct | Dark-theme paint errors | Light-theme paint errors | Collateral edits | LLM calls / file |
|---|---|---|---|---|---|
| Codemod, exact value, first match | 76.4 % | 63.0 | 36.0 | 0.0 | 0.0 |
| Codemod + near-miss + selector heuristics | 94.2 % | 12.0 | 0.0 | 0.0 | 0.0 |
| LLM rewrites whole file | 90.6 % ± 1.1 | 15.0 | 4.3 | 0.0 | 0.0 |
| Agent, LLM sees only property + value | 87.0 % ± 0.0 | 31.0 | 0.3 | 0.0 | 3.5 |
| Agent, LLM sees file + rule context | 96.0 % ± 0.2 | 7.7 | 2.0 | 0.0 | 3.5 |

Correct by site type (mean over seeds):

| Method | exact | ambiguous | near | format | deprecated | dim | keep |
|---|---|---|---|---|---|---|---|
| Codemod, exact value, first match | 89.0/89 | 23.0/49 | 1.0/40 | 20.0/20 | 17.0/17 | 50.0/50 | 23.0/27 |
| Codemod + near-miss + selector heuristics | 89.0/89 | 38.0/49 | 38.0/40 | 20.0/20 | 17.0/17 | 50.0/50 | 23.0/27 |
| LLM rewrites whole file | 86.3/89 | 34.7/49 | 35.0/40 | 20.0/20 | 15.0/17 | 48.0/50 | 25.7/27 |
| Agent, LLM sees only property + value | 89.0/89 | 23.0/49 | 32.0/40 | 20.0/20 | 17.0/17 | 50.0/50 | 23.0/27 |
| Agent, LLM sees file + rule context | 89.0/89 | 39.3/49 | 38.0/40 | 20.0/20 | 17.0/17 | 50.0/50 | 27.0/27 |

**Reading it:**
- On the held-out split the agent is right on **96.0 %** of declarations against **94.2 %** for the strongest codemod: a small gain in accuracy. The larger difference is where it errs: **7.7 vs 12 dark-theme paint errors** and **27/27 vs 23/27** "must not change" sites kept (the codemod turns the QR code's fixed white and the print-only black into theme tokens).
- The naive value codemod looks fine in light mode (36 light paint errors) but produces **63** dark-mode errors, because equal light values hide different dark values.
- The same agent with the LLM seeing only `property: value` drops to 87.0 % and solves 23/49 ambiguous sites, exactly as many as the naive codemod: **the gain comes from the selector and file context**, not from the model alone.
- Letting the LLM rewrite whole files reaches 90.6 %; it never broke a file or touched other lines here, but it drifts on sizes (48/50) and deprecated names (15/17), which the agent handles deterministically.
- The agent called the LLM 3.5 times per file (only for ties and commented lines); everything else is rule-based.

Dev split (used for prompt tuning; agent prompt v1 scored 122/146 = 83.6 %, v2 134/146 = 91.8 %, final 138/146):

### dev split (146 graded declarations)

| Method | Correct | Dark-theme paint errors | Light-theme paint errors | Collateral edits | LLM calls / file |
|---|---|---|---|---|---|
| Codemod, exact value, first match | 69.2 % | 44.0 | 26.0 | 0.0 | 0.0 |
| Codemod + near-miss + selector heuristics | 90.4 % | 12.0 | 2.0 | 0.0 | 0.0 |
| LLM rewrites whole file | 85.6 % | 20.0 | 10.0 | 0.0 | 0.0 |
| Agent, LLM sees file + rule context | 94.5 % | 6.0 | 2.0 | 0.0 | 4.2 |

Correct by site type (mean over seeds):

| Method | exact | ambiguous | near | format | deprecated | dim | keep |
|---|---|---|---|---|---|---|---|
| Codemod, exact value, first match | 47.0/47 | 12.0/28 | 0.0/26 | 4.0/4 | 3.0/3 | 24.0/24 | 11.0/14 |
| Codemod + near-miss + selector heuristics | 47.0/47 | 21.0/28 | 22.0/26 | 4.0/4 | 3.0/3 | 24.0/24 | 11.0/14 |
| LLM rewrites whole file | 47.0/47 | 19.0/28 | 17.0/26 | 4.0/4 | 3.0/3 | 21.0/24 | 14.0/14 |
| Agent, LLM sees file + rule context | 47.0/47 | 23.0/28 | 23.0/26 | 4.0/4 | 3.0/3 | 24.0/24 | 14.0/14 |

<!-- results:end -->

## How the benchmark is built

`agent/tokenforge_agent/corpus.py` generates 30 legacy stylesheets (20 CSS, 10 Lit components, seed 7) from role templates such as "secondary button background" or "info message border". Each graded declaration has a label:

| Site type | What it is |
|---|---|
| exact | hard-coded value equal to exactly one token of the property's category |
| ambiguous | hard-coded value equal to two or more tokens of that category (decided by context) |
| near | legacy drift: a value a few units off the design value |
| format | the same colour written as `rgb()` |
| deprecated | an old token variable that was renamed |
| dim | a px size for padding, gap, margin, radius or font size |
| keep | must not change: a QR code that needs pure white in every theme, a print colour, a logo, an off-palette badge, shadows, layout sizes |

Split by file: every third file is **dev** (used to tune the agent prompt and nothing else), the other 20 files are **test** and were run once after the design was frozen. "Dark-theme paint errors" resolves every token in the output to its dark-theme value and counts declarations that paint a different colour than the label would. "Collateral edits" counts changed or added declarations that were not graded sites.

Run it (Ollama with `qwen3-coder:30b`, Node 22, Python 3.10+):

```bash
npm ci && npm run tokens
cd agent && uv venv -p 3.11 .venv && uv pip install -p .venv/bin/python -e ".[dev]"
.venv/bin/python -m tokenforge_agent.corpus
.venv/bin/python -m tokenforge_agent.run_eval --split test --methods rules rules_plus agent agent_nocontext llm_file --seeds 0 1 2
.venv/bin/python -m tokenforge_agent.report
```

`OLLAMA_URL`, `TF_MODEL` and `TF_NUM_CTX` select the server, model and context size. LLM replies are cached under `agent/results/cache/` so runs resume.

## Limits

- **The corpus and its labels are synthetic and mine.** The role templates decide what is "right" (for example that `__note` is an info message). Real consumer code is messier: shorthand properties, `!important`, Sass, CSS-in-JS and Tailwind arbitrary values are not covered.
- **One model, one GPU:** Qwen3-Coder 30B (Q4_K_M) through Ollama on one NVIDIA L4, temperature 0.3, 3 seeds. Latency is not reported because the GPU was shared with another job during the runs.
- **The agent prompt was tuned on dev in three versions** (all dev runs are kept in `agent/results/raw.jsonl` as `agent_v1`, `agent_v2`, `agent`). The whole-file LLM baseline was run on dev once and not tuned, and the codemod heuristics were written before any run.
- The line parser expects one declaration per line, which holds for the generated files and for formatted code, not for minified CSS.
- No Figma connection: tokens are edited as JSON. A Figma Variables export in DTCG format would plug into the same build.
- The component library is small (4 components) and is not published to npm.

## Layout

```
tokens/            DTCG source: primitive/, semantic/{light,dark}.json, deprecated.json, contrast-pairs.json
scripts/           build-tokens.mjs (Style Dictionary), validate-tokens.mjs, token-diff.mjs, build-site.mjs
src/components/    Lit web components
stories/           Storybook stories (components, Tailwind consumer, token table)
tests/unit         Vitest: contrast maths, release policy, component token rule
tests/e2e          Playwright: axe, behaviour, visual snapshots
agent/             Python migration agent, corpus generator, evaluation and report
.github/workflows  ci.yml, token-release.yml
```

MIT licence.
