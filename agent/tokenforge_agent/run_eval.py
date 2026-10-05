"""Run methods over a split. Resumable: results/raw.jsonl is appended, finished (file, method, seed) skipped.

python -m tokenforge_agent.run_eval --split dev --methods rules rules_plus agent agent_nocontext llm_file --seeds 0 1 2
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import methods
from .corpus import load, split
from .score import score_file

RAW = Path(__file__).resolve().parents[1] / "results" / "raw.jsonl"
DETERMINISTIC = {"rules", "rules_plus"}


def run_one(method: str, text: str, fname: str, seed: int, log: list) -> str:
    if method == "rules":
        return methods.rules(text)
    if method == "rules_plus":
        return methods.rules(text, plus=True)
    if method == "agent":
        return methods.agent(text, fname, seed, context=True, log=log)
    if method == "agent_nocontext":
        return methods.agent(text, fname, seed, context=False, log=log)
    if method == "llm_file":
        return methods.llm_file(text, fname, seed)
    raise ValueError(method)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", choices=["dev", "test"], required=True)
    ap.add_argument("--methods", nargs="+", required=True)
    ap.add_argument("--seeds", nargs="+", type=int, default=[0])
    args = ap.parse_args()

    files, sites = load()
    RAW.parent.mkdir(parents=True, exist_ok=True)
    done = set()
    if RAW.exists():
        for line in RAW.read_text().splitlines():
            r = json.loads(line)
            done.add((r["file"], r["method"], r["seed"]))
    for method in args.methods:
        seeds = [0] if method in DETERMINISTIC else args.seeds
        for seed in seeds:
            for fname in split(list(files), args.split):
                if (fname, method, seed) in done:
                    continue
                log: list = []
                out = run_one(method, files[fname], fname, seed, log)
                res = score_file(files[fname], out, [s for s in sites if s.file == fname])
                rec = {"file": fname, "split": args.split, "method": method, "seed": seed, **res, "llm_calls": log}
                with RAW.open("a") as f:
                    f.write(json.dumps(rec) + "\n")
                ok = sum(s["correct"] for s in res["sites"])
                print(
                    f"{method:16s} seed {seed} {fname:24s} {ok}/{len(res['sites'])} "
                    f"collateral {res['collateral']} parses {res['parses']}",
                    flush=True,
                )


if __name__ == "__main__":
    main()
