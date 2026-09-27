const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../docs/_site');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const name of ['index','getting-started','reference','examples','development','changelog']) {
    await page.goto(`${origin}/${name}.html`);await page.waitForLoadState('networkidle');
    assert(await page.locator('main h1').count());
    if(name==='reference') {
      const example=await page.locator('pre').filter({hasText:'## Two pictures'}).innerText();
      assert.equal(example.split('{{< placeholder 380 250 format=svg >}}').length-1,2);
      assert(!example.includes('data:image/'), 'Authoring example must show shortcodes, not generated image data');
      assert((await page.locator('main').innerText()).includes('{{< fa brands orcid >}}'));
    }
    for(const href of await page.locator('a[href]').evaluateAll(links=>links.map(a=>a.href))) {
      const url=new URL(href);if(url.origin!==origin)continue;
      const file=path.join(root,decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
      assert(fs.existsSync(file),`${name}: broken local link ${href}`);
    }
    if(name==='index')await page.screenshot({path:'.build/site-home.png',fullPage:true});
  }
  await page.goto(`${origin}/demo.html`);await page.waitForFunction(()=>window.Reveal?.isReady());
  assert.equal(await page.evaluate(()=>Reveal.getSlides().length),14);
  assert.equal(await page.evaluate(()=>!!JSON.parse(document.getElementById('au-config').textContent).embeddedFonts),false);
  assert.deepEqual(await page.evaluate(()=>window.auCheck()),[]);
  assert.equal(errors.length,0,errors.join('\n'));
  await page.screenshot({path:'.build/site-demo.png'});
  console.log('Website pages, local links, live deck and absence of embedded AU fonts verified.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
