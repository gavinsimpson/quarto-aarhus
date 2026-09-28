#!/usr/bin/env python3
"""Convert the approved original AU TTF fonts without subsetting.

Development only: pip install 'fonttools[woff]==4.66.0'
"""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont

NAMES = [
    'AUPassata_Rg', 'AUPassata_Bold', 'AUPass_RgOblique',
    'AUPass_BoldOblique', 'AUPassata_Light', 'AUPassLight_Bold',
    'AUPassLight_BoldOblique', 'AUPassLight_Oblique', 'AU_Peto',
]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
target = Path(__file__).resolve().parents[1] / '_extensions/aarhus/assets/fonts'
target.mkdir(parents=True, exist_ok=True)
manifest = {}
for name in NAMES:
    source = args.source / (name + '.ttf')
    output = target / (name + '.woff2')
    with TTFont(source, recalcTimestamp=False) as font:
        font.flavor = 'woff2'
        font.save(output)
        with TTFont(output) as converted:
            assert font.getGlyphOrder() == converted.getGlyphOrder(), name
            assert font.getBestCmap() == converted.getBestCmap(), name
            assert font['name'].compile(font) == converted['name'].compile(converted), name
            assert font['hmtx'].metrics == converted['hmtx'].metrics, name
    manifest[name] = {
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'woff2_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'source_bytes': source.stat().st_size,
        'woff2_bytes': output.stat().st_size,
    }
(target / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Font bytes: TTF', sum(f['source_bytes'] for f in manifest.values()),
      '-> WOFF2', sum(f['woff2_bytes'] for f in manifest.values()))
