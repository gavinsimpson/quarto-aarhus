#!/usr/bin/env python3
"""Stage a font-embedded example and the current extension before Quarto loads it."""
from pathlib import Path
import shutil, subprocess, argparse
p=argparse.ArgumentParser();p.add_argument('--quarto',default='quarto');p.add_argument('--prepare-only',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parents[1];docs=root/'docs'
ext=docs/'_extensions'
if ext.exists():shutil.rmtree(ext)
shutil.copytree(root/'_extensions',ext)
generated=docs/'_generated';generated.mkdir(exist_ok=True)
readme=(root/'README.md').read_text()
reference=readme[readme.index('## Theme options'):readme.index('## Development and validation')]
# README shortcodes are literal examples. Escape them for Quarto so the website
# displays copyable source instead of executing placeholders or icon shortcodes.
reference=reference.replace('{{<', '{{{<').replace('>}}', '>}}}')
(generated/'reference.md').write_text(reference)
(generated/'testing.md').write_text((root/'TESTING.md').read_text().split('\n',1)[1])
starter=(root/'template.qmd').read_text()
# Do not use AU_FONT_DIR in this build, even when set in a developer's shell.
assert not any(line.lstrip().startswith('font-dir:') for line in starter.splitlines()), 'Public starter must use bundled fonts'
(docs/'demo.qmd').write_text(starter.replace('    html-math-method: mathml','    html-math-method: mathml\n    embed-resources: true'))
(docs/'downloads').mkdir(exist_ok=True)
(docs/'downloads/template.qmd').write_text(starter)
if not a.prepare_only:subprocess.run([a.quarto,'render',str(docs)],cwd=root,check=True)
