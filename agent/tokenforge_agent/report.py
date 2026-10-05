"""Aggregates results/raw.jsonl into results/summary.json and the RESULTS.md tables."""

from __future__ import annotations

import json
import statistics
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
RAW = HERE / "results" / "raw.jsonl"
ORDER = ["rules", "rules_plus", "llm_file", "agent_nocontext", "agent"]
LABEL = {
    "rules": "Codemod, exact value, first match",
    "rules_plus": "Codemod + near-miss + selector heuristics",
    "llm_file": "LLM rewrites whole file",
    "agent_nocontext": "Agent, LLM sees only property + value",
    "agent": "Agent, LLM sees file + rule context",
}
KINDS = ["exact", "ambiguous", "near", "format", "deprecated", "dim", "keep"]


def _kind(s: dict) -> str:
    return "ambiguous" if s["ambiguous"] else s["kind"]


def summarise(split: str) -> dict:
    rows = [json.loads(line) for line in RAW.read_text().splitlines()]
    rows = [r for r in rows if r["split"] == split]
    out = {}
    for method in ORDER:
        per_seed: dict[int, dict] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
        extra: dict[int, dict] = defaultdict(lambda: defaultdict(int))
        for r in rows:
            if r["method"] != method:
                continue
            agg, ex = per_seed[r["seed"]], extra[r["seed"]]
            for s in r["sites"]:
                for k in ("all", _kind(s)):
                    agg[k][0] += s["correct"]
                    agg[k][1] += 1
                ex["dark_err"] += s["dark_err"]
                ex["light_err"] += s["light_err"]
            ex["collateral"] += r["collateral"]
            ex["unparsable"] += not r["parses"]
            ex["files"] += 1
            ex["llm_calls"] += len(r.get("llm_calls", []))
        if not per_seed:
            continue

        def stat(values: list[float]) -> dict:
            return {"mean": statistics.mean(values), "sd": statistics.pstdev(values) if len(values) > 1 else 0.0}

        seeds = sorted(per_seed)
        out[method] = {
            "seeds": seeds,
            "n_sites": per_seed[seeds[0]]["all"][1],
            "accuracy": stat([per_seed[s]["all"][0] / per_seed[s]["all"][1] for s in seeds]),
            "by_kind": {
                k: {"correct": stat([per_seed[s][k][0] for s in seeds])["mean"], "n": per_seed[seeds[0]][k][1]}
                for k in KINDS
                if per_seed[seeds[0]][k][1]
            },
            "dark_errors": stat([extra[s]["dark_err"] for s in seeds]),
            "light_errors": stat([extra[s]["light_err"] for s in seeds]),
            "collateral": stat([extra[s]["collateral"] for s in seeds]),
            "unparsable_files": stat([extra[s]["unparsable"] for s in seeds]),
            "llm_calls_per_file": stat([extra[s]["llm_calls"] / extra[s]["files"] for s in seeds]),
        }
    return out


def markdown(split: str, summ: dict) -> str:
    n = next(iter(summ.values()))["n_sites"]
    lines = [
        f"### {split} split ({n} graded declarations)",
        "",
        "| Method | Correct | Dark-theme paint errors | Light-theme paint errors | Collateral edits "
        "| LLM calls / file |",
        "|---|---|---|---|---|---|",
    ]
    for m, s in summ.items():
        acc = s["accuracy"]
        sd = f" ± {acc['sd'] * 100:.1f}" if len(s["seeds"]) > 1 else ""
        lines.append(
            f"| {LABEL[m]} | {acc['mean'] * 100:.1f} %{sd} | {s['dark_errors']['mean']:.1f} | "
            f"{s['light_errors']['mean']:.1f} | {s['collateral']['mean']:.1f} | {s['llm_calls_per_file']['mean']:.1f} |"
        )
    lines += ["", "Correct by site type (mean over seeds):", ""]
    lines.append("| Method | " + " | ".join(KINDS) + " |")
    lines.append("|---|" + "---|" * len(KINDS))
    for m, s in summ.items():
        cells = []
        for k in KINDS:
            b = s["by_kind"].get(k)
            cells.append(f"{b['correct']:.1f}/{b['n']}" if b else "-")
        lines.append(f"| {LABEL[m]} | " + " | ".join(cells) + " |")
    return "\n".join(lines) + "\n"


def main() -> None:
    result = {split: summarise(split) for split in ("dev", "test")}
    (HERE / "results" / "summary.json").write_text(json.dumps(result, indent=2) + "\n")
    for split, summ in result.items():
        if summ:
            print(markdown(split, summ))


if __name__ == "__main__":
    main()
