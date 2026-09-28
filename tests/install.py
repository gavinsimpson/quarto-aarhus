#!/usr/bin/env python3
"""Exercise real Quarto archive installation without Git history or local notes."""
from pathlib import Path
import subprocess,tempfile,zipfile,os
root=Path(__file__).resolve().parents[1]
quarto=os.environ.get('QUARTO','quarto')
with tempfile.TemporaryDirectory(prefix='aarhus-install-') as temporary:
    temp=Path(temporary);archive=temp/'aarhus.zip'
    files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
    with zipfile.ZipFile(archive,'w') as z:
        for name in files:
            path=root/name
            if not name or not path.is_file():continue
            if path.suffix in ['.ttf','.woff2'] and 'fontawesome' not in path.parts and not (path.parent == root/'_extensions/aarhus/assets/fonts' and path.suffix == '.woff2'):
                raise AssertionError('Unexpected font: '+str(path))
            z.write(path,name)
    for mode in ['extension','template']:
        dest=temp/mode;dest.mkdir()
        command=['use','template'] if mode=='template' else ['add']
        subprocess.run([quarto,*command,str(archive),'--no-prompt'],cwd=dest,check=True,stdout=subprocess.DEVNULL)
        assert (dest/'_extensions/aarhus/title-slide.html').exists()
        assert (dest/'_extensions/aarhus/LICENSE').exists()
        assert (dest/'_extensions/aarhus/_extensions/quarto-ext/fontawesome/LICENSE').exists()
        assert not any((dest/name).exists() for name in ['docs','tests','tools','package.json','TESTING.md'])
        if mode=='extension':
            source=dest/'check.qmd';source.write_text('---\ntitle: Install check\nformat: aarhus-revealjs\n---\n\n## Example\n\nHello.\n')
        else:source=next(dest.glob('*.qmd'))
        subprocess.run([quarto,'render',source.name,'--quiet'],cwd=dest,check=True)
        html=source.with_suffix('.html').read_text()
        assert html.count('data:font/woff2;base64,') == 9
        assert len(list((dest/'_extensions/aarhus/assets/fonts').glob('*.woff2'))) == 9
        assert (dest/'_extensions/aarhus/assets/fonts/README.md').exists()
        # An incomplete package must fail clearly rather than use installed fonts.
        (dest/'_extensions/aarhus/assets/fonts/AU_Peto.woff2').unlink()
        result=subprocess.run([quarto,'render',source.name],cwd=dest,capture_output=True,text=True)
        assert result.returncode != 0
        assert 'AU_Peto.woff2' in result.stdout + result.stderr
print('Both archive installation paths and fresh renders passed; developer files excluded.')
