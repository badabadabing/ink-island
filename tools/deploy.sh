#!/bin/bash
# Push the committed HEAD to GitHub and publish the playable files (index.html, js/, vendor/) to Cloudflare Pages project `salty-isle`.
# Requires: push access to origin, `wrangler login` done once. Docs, tools and the inkstrike reference snapshot are not published.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区有未提交改动，先 commit"; exit 1; }
for f in js/*.js; do node --check "$f"; done
git push
D=$(mktemp -d); git archive HEAD index.html js vendor | tar -x -C "$D"
wrangler pages deploy "$D" --project-name salty-isle --branch main --commit-dirty=true
rm -rf "$D"
echo "Live: https://salty-isle.pages.dev  |  repo: https://github.com/badabadabing/ink-island"
