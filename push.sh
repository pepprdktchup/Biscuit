#!/bin/bash
# Auto-bump SW cache version and push
cd ~/biscuit-repo

# Bump SW version
python3 -c "
import re
content = open('sw.js').read()
m = re.search(r'biscuit-v(\d+)', content)
v = int(m.group(1)) + 1
open('sw.js', 'w').write(content.replace(m.group(0), f'biscuit-v{v}'))
print(f'SW bumped to v{v}')
"

git add -A
git commit -m "${1:-Update}"
git push
