#!/usr/bin/env python3
"""Render isolated extension fixtures; bundled AU fonts are embedded by default."""
import argparse, json, os, re, shutil, subprocess, tempfile
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--font-dir',default=os.environ.get('AU_FONT_DIR')); p.add_argument('--quarto',default='quarto');p.add_argument('--build-dir',default='.build');a=p.parse_args()
root=Path(__file__).resolve().parents[1]; build=(root/a.build_dir).resolve();build.mkdir(parents=True,exist_ok=True)
fonts=str(Path(a.font_dir).resolve()) if a.font_dir else None
font_line=('  font-dir: '+json.dumps(fonts)+'\n') if fonts else ''
starter=(root/'template.qmd').read_text()
manifest=[]
def render(name,text,success=True,directory=None):
    d=directory or build/name;d.mkdir(exist_ok=True)
    if (d/'_extensions').exists(): shutil.rmtree(d/'_extensions')
    shutil.copytree(root/'_extensions',d/'_extensions')
    (d/'deck.qmd').write_text(text)
    result=subprocess.run([a.quarto,'render','deck.qmd','--quiet'],cwd=d,capture_output=True,text=True)
    if success and (result.returncode or 'ERROR' in result.stderr): raise RuntimeError(name+'\n'+result.stderr)
    if not success and result.returncode==0: raise AssertionError(name+' should fail')
    return d
for ratio,height in [('16:9',540),('16:10',600),('4:3',720)]:
    for colour in ['dark-blue','dark-magenta']:
        name=ratio.replace(':','-')+'-'+colour
        text=starter.replace('colour: dark-blue','colour: '+colour).replace('aspect-ratio: "16:9"','aspect-ratio: "'+ratio+'"')
        text=text.replace('aarhus:\n','aarhus:\n'+font_line)
        d=render(name,text)
        manifest.append({'name':name,'path':str(d/'deck.html'),'height':height,'colour':'#002546' if colour=='dark-blue' else '#5f0030'})
base='''---
format:
  aarhus-revealjs:
    embed-resources: true
author:
  - name: Jane Jensen
    affiliations:
      - name: Example Institute
aarhus:
  font-dir: FONT_DIR
  colour: yellow
  end-slide: peto
---

## Æble, økologi og ål

Ordinary **bold**, *italic*, and ***bold italic*** text.

## Footer override {au-footer="true"}

Content with a footer.

## No footer {au-footer="false"}

Content without a footer.
'''.replace('  font-dir: FONT_DIR\n',font_line)
d=render('portable',base);manifest.append({'name':'portable','path':str(d/'deck.html'),'height':540,'colour':'#fabb00'})
# Exercise explicit WOFF2 overrides even when AU_FONT_DIR is unset.
override_base=base.replace(font_line, '') if font_line else base
override_dir=str(root/'_extensions/aarhus/assets/fonts')
d=render('font-override',override_base.replace('aarhus:\n','aarhus:\n  font-dir: '+json.dumps(override_dir)+'\n'))
manifest.append({'name':'font-override','path':str(d/'deck.html'),'height':540,'colour':'#fabb00'})
# Assertions exercise validation failures, not implementation details.
for name,old,new in [('bad-colour','colour: yellow','colour: banana'),('bad-orcid-colour','colour: yellow','orcid-colour: purple'),('bad-ratio','colour: yellow','aspect-ratio: "3:4"'),('bad-width','embed-resources: true','width: 1000'),('bad-default-width','embed-resources: true','width: 1050'),('bad-height','embed-resources: true','height: 600'),('bad-layout','## Æble, økologi og ål','## Invalid {au-layout="nope"}'),('missing-font','colour: yellow','colour: yellow\n  font-dir: missing-fonts')]:
    render(name,base.replace(old,new),False)
for key,value in [('width',1050),('height',700)]:
    # .build is intentionally ignored by Quarto; project discovery needs an external directory.
    with tempfile.TemporaryDirectory(prefix='au-project-') as project:
        d=Path(project)
        (d/'_quarto.yml').write_text('project:\n  type: default\nformat:\n  aarhus-revealjs:\n    '+key+': '+str(value)+'\n')
        render('project-'+key,base,False,directory=d)
title_fixture=base.replace('author:', 'title: "A native title"\nsubtitle: "A short subtitle"\ntitle-slide-attributes:\n  data-background-color: "#123456"\npresenter:\n  name: Preferred Name\n  institute: Preferred Institute\nauthor:',1)
d=render('native-title',title_fixture);manifest.append({'name':'native-title','path':str(d/'deck.html'),'height':540,'colour':'#fabb00'})
authors_fixture="""---
title: Dyr og Data
subtitle: "Statistical thinking --- exploratory data analysis"
format:
  aarhus-revealjs:
    embed-resources: true
author:
  - name: Joe Bloggs
    orcid: 0000-0000-0000-0000
    email: joe-blogs@dept.au.dk
    affiliations: Aarhus University
  - name: Jane Doe
    email: jane-doe@dept.au.dk
    affiliations:
      - ref: au
      - name: Second Institute
affiliations:
  - id: au
    name: Aarhus University
presenter:
  name: Visiting Presenter
  institute: Footer Department
title-slide-attributes:
  data-background-color: "#003d73"
aarhus:
  font-dir: FONT_DIR
---

## Example

Author metadata is independent of the presenter.
""".replace('  font-dir: FONT_DIR\n',font_line)
d=render('authors',authors_fixture);manifest.append({'name':'authors','path':str(d/'deck.html'),'height':540,'colour':'#002546'})
d=render('authors-theme',authors_fixture.replace('aarhus:\n', 'aarhus:\n  orcid-colour: theme\n'));manifest.append({'name':'authors-theme','path':str(d/'deck.html'),'height':540,'colour':'#002546'})
text=base.replace('## Æble, økologi og ål','## '+('A long heading ' * 30)).replace('Ordinary **bold**, *italic*, and ***bold italic*** text.', '\n\n'.join(['Overflow paragraph']*60))
d=render('overflow',text);manifest.append({'name':'overflow','path':str(d/'deck.html'),'height':540,'colour':'#fabb00'})
# Every ending is exercised in all aspect ratios; no authoring classes required.
for ratio,height in [('16:9',540),('16:10',600),('4:3',720)]:
    for ending in ['none','logo','peto','wordmark']:
        name='ending-'+ending+'-'+ratio.replace(':','-')
        text=base.replace('end-slide: peto','end-slide: '+ending+'\n  aspect-ratio: "'+ratio+'"')
        d=render(name,text)
        manifest.append({'name':name,'path':str(d/'deck.html'),'height':height,'colour':'#fabb00','ending':ending})
contrast="""---
format: aarhus-revealjs
aarhus:
  colour: yellow
FONT_LINE---

## Dark override {background-color="#123456"}

[Link](https://example.org)

## Light override {background-color="ivory"}

Text on a pale background.

## Translucent override {background-color="rgba(0, 0, 0, 0.1)"}

Text on a transparent colour over white.
""".replace('FONT_LINE',font_line)
d=render('backgrounds',contrast);manifest.append({'name':'backgrounds','path':str(d/'deck.html'),'height':540,'colour':'#fabb00'})
missing=starter
d=render('missing-fonts',missing)
# Rename the lookups, including the plugin's detection, so the test is reliable
# even on a developer machine with AU fonts installed. No font data is embedded.
html=d/'deck.html'
content=re.sub(r'@font-face\{[^}]*\}', '', html.read_text())
content=content.replace('"embeddedFonts":true', '"embeddedFonts":false')
html.write_text(content.replace('AU Peto','Missing Test Peto').replace('AU Passata','Missing Test Passata'))
for css in (d/'deck_files').rglob('*.css'):
    css.write_text(css.read_text().replace('AU Peto','Missing Test Peto').replace('AU Passata','Missing Test Passata'))
for js in (d/'deck_files').rglob('aarhus.js'):
    js.write_text(js.read_text().replace('AU Peto','Missing Test Peto').replace('AU Passata','Missing Test Passata'))
manifest.append({'name':'missing-fonts','path':str(html),'height':540,'colour':'#002546'})
for fixture in manifest:
    fixture['embeddedFonts']=fixture['name']!='missing-fonts'
(build/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Rendered {len(manifest)} configurations; 10 invalid inputs rejected. Bundled AU fonts enabled; override: {bool(fonts)}')
