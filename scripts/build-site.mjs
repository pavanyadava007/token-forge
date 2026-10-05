// Builds site/ for the Hugging Face static Space: a results page styled with our own tokens,
// plus the Storybook build under site/storybook/.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync('agent/results/summary.json', 'utf8'));
const contrast = JSON.parse(readFileSync('reports/contrast.json', 'utf8'));
const LABEL = {
  rules: 'Codemod, exact value, first match',
  rules_plus: 'Codemod + near-miss + selector heuristics',
  llm_file: 'LLM rewrites whole file',
  agent_nocontext: 'Agent, LLM sees only property + value',
  agent: 'Agent, LLM sees file + rule context',
};
const KINDS = ['exact', 'ambiguous', 'near', 'format', 'deprecated', 'dim', 'keep'];
const pct = (x) => (x * 100).toFixed(1);

function table(split) {
  const s = summary[split];
  const rows = Object.entries(s)
    .map(([m, r]) => {
      const sd = r.seeds.length > 1 ? ` &plusmn; ${pct(r.accuracy.sd)}` : '';
      return `<tr><th scope="row">${LABEL[m]}</th><td>${pct(r.accuracy.mean)} %${sd}</td><td>${r.dark_errors.mean.toFixed(1)}</td><td>${r.collateral.mean.toFixed(1)}</td><td>${r.llm_calls_per_file.mean.toFixed(1)}</td></tr>`;
    })
    .join('\n');
  const kinds = Object.entries(s)
    .map(
      ([m, r]) =>
        `<tr><th scope="row">${LABEL[m]}</th>${KINDS.map((k) => (r.by_kind[k] ? `<td>${r.by_kind[k].correct.toFixed(1)}/${r.by_kind[k].n}</td>` : '<td>-</td>')).join('')}</tr>`,
    )
    .join('\n');
  const n = Object.values(s)[0].n_sites;
  return `<h3>${split === 'test' ? 'Held-out test split' : 'Dev split (used for tuning)'}: ${n} graded declarations</h3>
<div class="scroll"><table><thead><tr><th>Method</th><th>Correct</th><th>Dark-theme paint errors</th><th>Collateral edits</th><th>LLM calls / file</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="scroll"><table><thead><tr><th>By site type</th>${KINDS.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${kinds}</tbody></table></div>`;
}

const minRatio = Math.min(...contrast.map((c) => c.ratio / c.min));
const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>token-forge</title>
<meta name="description" content="Design tokens to CSS variables and a Tailwind v4 theme, Lit web components, token-release automation and a measured LLM token-migration agent.">
<style>
${readFileSync('dist/css/light.css', 'utf8')}
${readFileSync('dist/css/dark.css', 'utf8')}
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { color-scheme: dark; } }
body { margin: 0; background: var(--tf-color-surface-default); color: var(--tf-color-text-primary); font: 16px/1.55 system-ui, sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: var(--tf-space-8) var(--tf-space-4); }
a { color: var(--tf-color-text-link); }
p, li { color: var(--tf-color-text-secondary); }
.card { background: var(--tf-color-surface-raised); border: 1px solid var(--tf-color-border-default); border-radius: var(--tf-radius-lg); padding: var(--tf-space-6); margin: var(--tf-space-6) 0; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; margin: var(--tf-space-3) 0; font-size: var(--tf-font-size-sm); }
th, td { text-align: left; padding: var(--tf-space-2) var(--tf-space-3); border-bottom: 1px solid var(--tf-color-border-default); }
td { font-variant-numeric: tabular-nums; }
button { font: inherit; background: var(--tf-color-action-secondary-bg); color: var(--tf-color-text-primary); border: 1px solid var(--tf-color-action-secondary-border); border-radius: var(--tf-radius-md); padding: var(--tf-space-1) var(--tf-space-3); cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--tf-color-border-focus); outline-offset: 2px; }
.cta { display: inline-block; background: var(--tf-color-action-primary-bg); color: var(--tf-color-text-on-action); padding: var(--tf-space-2) var(--tf-space-4); border-radius: var(--tf-radius-md); text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<main>
<header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <h1 style="margin:0">token-forge</h1>
  <button id="theme" type="button" aria-label="Switch colour theme">Dark theme</button>
</header>
<p>One design-token source (W3C DTCG JSON) built with Style Dictionary into CSS variables, a Tailwind v4 theme and typed JS; four Lit web components that use only semantic tokens; a GitHub Action that turns every token PR into a semver release plan; and an LLM migration agent that moves legacy CSS onto the tokens, measured against two codemods and a whole-file LLM rewrite. This page is styled with the generated tokens: the button above switches the theme by changing one attribute.</p>
<p><a class="cta" href="storybook/index.html">Open the component Storybook</a> &nbsp; <a href="https://github.com/pavanyadava007/token-forge">Code on GitHub</a></p>
<div class="card">
<h2 style="margin-top:0">Token-migration benchmark</h2>
<p>30 legacy stylesheets (20 CSS, 10 Lit), ${Object.values(summary.dev)[0].n_sites + Object.values(summary.test)[0].n_sites} graded declarations. Several tokens share a light-theme value (white is page, card and secondary-button background), so a value-only codemod can look right in light mode and still paint the wrong colour in dark mode. "Dark-theme paint errors" counts exactly that. Model: Qwen3-Coder 30B (Q4_K_M) on one NVIDIA L4 via Ollama, temperature 0.3, 3 seeds. The corpus and its labels are synthetic and were written by me; see the README for limits.</p>
${table('test')}
${table('dev')}
</div>
<div class="card">
<h2 style="margin-top:0">Token checks</h2>
<p>${contrast.length} WCAG 2.2 contrast pairs checked in both themes on every build; the lowest margin is ${(minRatio * 100 - 100).toFixed(0)} % above its minimum. Components are tested with axe (WCAG 2.2 AA) in both themes, with keyboard and form-association tests, and with visual snapshots in a pinned Playwright container.</p>
</div>
</main>
<script>
const btn = document.getElementById('theme');
const set = (t) => { document.documentElement.dataset.theme = t; btn.textContent = t === 'dark' ? 'Light theme' : 'Dark theme'; try { localStorage.setItem('tf-theme', t); } catch {} };
let start = 'light';
try { start = localStorage.getItem('tf-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch {}
set(start);
btn.addEventListener('click', () => set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
</script>
</body>
</html>
`;
rmSync('site', { recursive: true, force: true });
mkdirSync('site', { recursive: true });
writeFileSync('site/index.html', html);
cpSync('storybook-static', 'site/storybook', { recursive: true });
writeFileSync(
  'site/README.md',
  '---\ntitle: token-forge\nemoji: 🎨\ncolorFrom: blue\ncolorTo: gray\nsdk: static\npinned: false\nlicense: mit\n---\n\nDesign tokens, Lit web components and a measured LLM token-migration agent. Code: https://github.com/pavanyadava007/token-forge\n',
);
console.log('site/ built');
