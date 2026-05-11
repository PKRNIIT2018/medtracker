#!/usr/bin/env bash
set -euo pipefail

DOC="DOCUMENTATION.md"
ROOT="$(git rev-parse --show-toplevel)"
DOC_PATH="$ROOT/$DOC"

if [ ! -f "$DOC_PATH" ]; then
  echo "Error: $DOC not found at $DOC_PATH"
  exit 1
fi

TODAY="$(date +%Y-%m-%d)"
ROWS="$(git log --reverse --format="| %ad | \`%h\` | %s |" --date=format:"%Y-%m-%d" --all)"

# Build new changelog section
NEW_SECTION=$(cat <<EOF
## Change Log

Generated from git history. Last updated: $TODAY.

<!-- CHANGELOG_START -->
| Date | Commit | Description |
|------|--------|-------------|
$ROWS
<!-- CHANGELOG_END -->
EOF
)

export DOC_PATH
export NEW_SECTION

python3 << 'PYEOF' || { echo "Error: Python script failed"; exit 1; }
import os, sys

doc_path = os.environ['DOC_PATH']
new_section = os.environ['NEW_SECTION']

with open(doc_path) as f:
    content = f.read()

start_marker = '<!-- CHANGELOG_START -->'
end_marker = '<!-- CHANGELOG_END -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Error: Could not find changelog markers in DOCUMENTATION.md')
    sys.exit(1)

# Find the beginning of the Change Log section
section_start = content.rfind('## Change Log', 0, start_idx)
if section_start == -1:
    print('Error: Could not find "## Change Log" section header')
    sys.exit(1)

# Find end of end_marker line
end_of_line = content.index('\n', end_idx) + 1

new_content = content[:section_start] + new_section + '\n' + content[end_of_line:]

with open(doc_path, 'w') as f:
    f.write(new_content)

print('Updated DOCUMENTATION.md with latest git history.')
PYEOF
