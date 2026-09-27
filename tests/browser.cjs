const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const build = process.env.AU_BUILD_DIR ? path.resolve(process.env.AU_BUILD_DIR) : path.resolve(__dirname,'../.build');
(async () => {
  const browserName=process.env.AU_BROWSER || 'chromium';
  const browser = await playwright[browserName].launch({headless:true,...(browserName==='chromium' && process.env.CHROME_CHANNEL ? {channel:process.env.CHROME_CHANNEL} : {})});
  const results=[];
  try {
    for (const fixture of JSON.parse(fs.readFileSync(path.join(build,'manifest.json')))) {
      const context=await browser.newContext({viewport:{width:960,height:fixture.height}});
      // Offline rendering must not depend on fonts on the host or any network resource.
      await context.route(/^https?:/,route=>route.abort());
      const page=await context.newPage(); const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(fixture.path).href);
      await page.waitForFunction(()=>window.Reveal?.isReady());
      await page.evaluate(()=>document.fonts.ready);
      const summary=await page.evaluate(()=>({width:Reveal.getConfig().width,height:Reveal.getConfig().height,
        slides:Reveal.getSlides().map(s=>({layout:s.dataset.auLayout,footer:!!s.querySelector('.au-footer'),images:s.querySelectorAll('.au-content .quarto-layout-panel img').length})),
        issues:window.auCheck(),config:JSON.parse(document.getElementById('au-config').textContent),
        fonts:[...document.fonts].filter(f=>f.family.startsWith('AU')).map(f=>({family:f.family,status:f.status}))}));
      assert.equal(summary.width,960); assert.equal(summary.height,fixture.height);assert.equal(summary.config.colour,fixture.colour);
      assert.equal(!!summary.config.embeddedFonts,fixture.embeddedFonts);assert.equal(errors.length,0,JSON.stringify(errors));
      if (fixture.name==='overflow') {
        assert(summary.issues.some(i=>i.kind==='overflow'&&i.element.includes('au-content')),'body overflow missing');
        assert(summary.issues.some(i=>i.kind==='overflow'&&i.element.includes('au-heading')),'heading overflow missing');
      } else {
        assert.deepEqual(summary.issues,[],fixture.name+' diagnostics');
      }
      if (fixture.name==='portable') {
        assert.equal(summary.config.presenter,'');assert.equal(summary.config.institute,'');
        assert.equal(summary.config.event,'');assert.equal(summary.config.foreground,'#000000');
        assert.equal(summary.slides[1].footer,true);assert.equal(summary.slides[2].footer,false);
        const html=fs.readFileSync(fixture.path,'utf8'); assert(!html.includes('url("file:'));
        assert(!html.includes('src="deck_files/'));if(fixture.embeddedFonts) assert(html.includes('data:font/ttf;base64,'));
        const linkColour=await page.evaluate(()=>{
          const el=document.createElement('a');el.href='#';el.textContent='Link';document.querySelector('.au-content').append(el);
          const colour=getComputedStyle(el).color;el.remove();return colour;
        });
        const channels=linkColour.match(/[\d.]+/g).slice(0,3).map(n=>{const c=Number(n)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
        assert(1.05/(channels[0]*.2126+channels[1]*.7152+channels[2]*.0722+.05)>=4.5,'light-theme link contrast');
        const metadataIssues=await page.evaluate(()=>{
          const el=document.createElement('div');el.className='au-footer-field au-presenter-name';document.querySelector('.au-presenter').append(el);const before='';
          el.textContent='A long presenter name '.repeat(60);const issues=window.auCheck();
          el.textContent=before;window.auCheck();return issues;
        });
        assert(metadataIssues.some(i=>i.kind==='overflow'&&i.element.includes('au-footer-field')),'metadata overflow missing');
      } else if (fixture.name.startsWith('ending-')) {
        const ending=page.locator('#au-ending');
        assert.equal(await ending.count(),fixture.ending==='none'?0:1);
        if(fixture.ending!=='none') {
          assert.equal(await ending.locator('.au-footer, .au-page-number').count(),0);
          const visual=fixture.ending==='wordmark'?'.au-end-wordmark':fixture.ending==='logo'?'.au-end-logo':'.au-peto-ending, .au-end-logo';
          assert.equal(await ending.locator(visual).count(),1);
        }
      } else if (fixture.name==='backgrounds') {
        const colours=await page.locator('section.au-slide').evaluateAll(slides=>slides.map(s=>({
          text:getComputedStyle(s).color,
          mark:s.querySelector('.au-mark').src,
          link:s.querySelector('.au-content a')?getComputedStyle(s.querySelector('.au-content a')).color:null
        })));
        assert.equal(colours[0].text,'rgb(255, 255, 255)');
        assert.equal(colours[0].link,colours[0].text);
        assert.equal(colours[0].mark,summary.config.assets['mark-white']);
        for(const c of colours.slice(1)) {assert.equal(c.text,'rgb(0, 0, 0)');assert.equal(c.mark,summary.config.assets['mark-black']);}
      } else if (fixture.name==='missing-fonts') {
        assert.equal(await page.locator('.au-peto-ending, .au-section-peto').count(),0);
        assert.equal(await page.locator('[data-au-ending-fallback="seal"] .au-end-logo').count(),1);
        assert.equal(await page.locator('[data-au-rendered-motif="seal"]').count(),2);
      } else if (fixture.name.startsWith('authors')) {
        const title=page.locator('#title-slide .au-content');
        assert.equal(await title.locator('.quarto-title-author').count(),2);
        assert((await title.innerText()).includes('Joe Bloggs'));
        assert((await title.innerText()).includes('Jane Doe'));
        assert(!(await title.innerText()).includes('Visiting Presenter'));
        assert(!(await title.innerText()).includes('Footer Department'));
        assert.equal(await title.locator('.quarto-title-affiliation').count(),3);
        assert.equal(await title.locator('.quarto-title-author-orcid').count(),1);
        assert.equal(await title.locator('.quarto-title-author-orcid').getAttribute('href'),'https://orcid.org/0000-0000-0000-0000');
        assert.equal(await title.locator('a[href="mailto:jane-doe@dept.au.dk"]').count(),1);
        await page.waitForFunction(()=>[...document.querySelectorAll('#title-slide img')].every(i=>i.complete && i.naturalWidth>0));
        assert.equal(await title.locator('.fa-brands.fa-orcid').count(),1);
        const iconColour=await title.locator('.fa-orcid').evaluate(el=>getComputedStyle(el).color);
        assert.equal(iconColour,fixture.name==='authors-theme'?'rgb(255, 255, 255)':'rgb(166, 206, 57)');
        assert(await page.evaluate(()=>document.fonts.check('16px "Font Awesome 6 Brands"')));
        assert.equal(summary.config.presenter,'Visiting Presenter');
        assert.equal(summary.config.institute,'Footer Department');
        await page.screenshot({path:path.join(build,fixture.name+'.png')});
      } else if (fixture.name==='native-title') {
        assert.equal(summary.config.presenter,'Preferred Name'); assert.equal(summary.config.institute,'Preferred Institute');
        assert.equal(await page.locator('#title-slide').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
        assert.equal(summary.slides[0].layout,'title');assert.equal(await page.locator('#title-slide').getAttribute('data-background-color'),'#123456');
      } else if (fixture.name!=='overflow') {
        assert.equal(summary.slides.length,14);
        assert.equal(new Set(summary.slides.map(s=>s.layout)).size,4);
        for (let i=0;i<summary.slides.length;i++) {
          await page.evaluate(i=>{const index=Reveal.getIndices(Reveal.getSlides()[i]);Reveal.slide(index.h,index.v);if (Reveal.getCurrentSlide() !== Reveal.getSlides()[i]) throw new Error("Slide navigation failed");},i);
          await page.waitForFunction(()=>[...Reveal.getCurrentSlide().querySelectorAll('img')].every(img=>img.complete && img.naturalWidth>0));
          const geometry=await page.evaluate(()=>{
            const s=Reveal.getCurrentSlide(),scale=Reveal.getScale(),sr=s.getBoundingClientRect();
            const box=selector=>{const el=s.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {x:(r.x-sr.x)/scale,y:(r.y-sr.y)/scale,w:r.width/scale,h:r.height/scale};};
            return {id:s.id,layout:s.dataset.auLayout,content:box('.au-content'),footer:box('.au-footer'),mark:box('.au-mark'),seal:box('.au-seal'),heading:box('.au-heading'),rule:box('.au-rule'),ending:box('.au-end-logo'),images:[...s.querySelectorAll('.au-content .quarto-layout-panel img')].map(el=>{const r=el.getBoundingClientRect();return {x:(r.x-sr.x)/scale,y:(r.y-sr.y)/scale,w:r.width/scale,h:r.height/scale};})};
          });
          const near=(v,w)=>assert(Math.abs(v-w)<=2,`${fixture.name} slide ${i+1}: ${v} != ${w}`);
          if (geometry.footer) {near(geometry.footer.y,fixture.height-67.75);near(geometry.mark.x,23.82);near(geometry.seal.x,890.59);}
          if (geometry.layout==='content' && geometry.heading) {
            near(geometry.heading.x,77.65);near(geometry.rule.x,geometry.heading.x);near(geometry.content.x,geometry.heading.x);
            assert(geometry.rule.y >= geometry.heading.y + geometry.heading.h,'rule overlaps title');
            assert(geometry.content.y > geometry.rule.y + geometry.rule.h,'body overlaps rule');
          }
          if (geometry.id==='a-custom-figure-panel') {
            const [left,right,full]=geometry.images;
            near(left.x,full.x);
            near(right.x+right.w,full.x+full.w);
            near(full.x+full.w,geometry.content.x+geometry.content.w);
          }
          if (fixture.name==='16-9-dark-blue') await page.screenshot({path:path.join(build,`slide-${String(i).padStart(2,'0')}.png`)});
        }
        assert(await page.locator('.quarto-layout-panel').count()>=3,'native panels missing');
        assert(await page.locator('figcaption').count()>=5,'native captions missing');
        assert.equal(await page.locator('.au-image-slot').count(),0,'image structure was rewritten');
        const quoteStyle=await page.locator('blockquote').first().evaluate(el=>({weight:getComputedStyle(el).fontWeight,colour:getComputedStyle(el).color}));
        assert.equal(quoteStyle.weight,'400');assert.equal(quoteStyle.colour,'rgb(0, 0, 0)');
        assert(await page.locator('math').count()>0,'equation markup missing');
        assert(await page.locator('.fragment').count()>0,'fragment missing');
        assert(await page.locator('aside.notes').count()>0,'speaker notes missing');
        await page.setViewportSize({width:1440,height:900});
        await page.evaluate(()=>Reveal.toggleOverview(true)); assert(await page.evaluate(()=>Reveal.isOverview()));
        await page.evaluate(()=>Reveal.toggleOverview(false));
      }
      results.push({name:fixture.name,slides:summary.slides.length,issues:summary.issues});
      await context.close();
    }
    if(browserName==='chromium') for (const fixture of JSON.parse(fs.readFileSync(path.join(build,'manifest.json'))).filter(f=>f.name.endsWith('dark-blue'))) {
      const page=await browser.newPage();
      await page.goto(pathToFileURL(fixture.path).href+'?print-pdf');
      await page.waitForFunction(()=>document.querySelectorAll('.pdf-page').length>0);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('.pdf-page').count(),14);
      const name=fixture.name==='16-9-dark-blue'?'starter.pdf':fixture.name+'.pdf';
      await page.pdf({path:path.join(build,name),printBackground:true,preferCSSPageSize:true});
      await page.close();
    }
    fs.writeFileSync(path.join(build,'results-'+browserName+'.json'),JSON.stringify(results,null,2));
    console.log('Browser checks passed; screenshots, PDF and results saved in .build/.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
