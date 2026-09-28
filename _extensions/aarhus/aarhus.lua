-- Keep document content in the Pandoc AST; the browser supplies only slide chrome.
local root = pandoc.path.directory(PANDOC_SCRIPT_FILE)
local palette = dofile(root .. '/palette.lua')
local opts, config = {}, {}
local function str(v, default) return v ~= nil and pandoc.utils.stringify(v) or default end
local function fail(s) assert(false, 'Aarhus: '..s) end
local function read(path)
  local f=io.open(path,'rb'); if not f then fail('Cannot read '..path) end
  local s=f:read('*a'); f:close(); return s
end
local function data(path,mime) return 'data:'..mime..';base64,'..quarto.base64.encode(read(path)) end
local function choice(v, allowed, key)
  if not allowed[v] then fail('Invalid '..key..' "'..v..'". See the Aarhus README for supported values.') end
  return v
end
local function textmeta(v)
  if v == nil then return '' end
  if type(v)=='table' and v.name then return str(v.name,'') end
  return str(v,'')
end
local function luminance(hex)
  local function channel(i)
    local c=tonumber(hex:sub(i,i+1),16)/255
    return c<=0.04045 and c/12.92 or ((c+0.055)/1.055)^2.4
  end
  return 0.2126*channel(2)+0.7152*channel(4)+0.0722*channel(6)
end
local function meta(m)
  opts=m.aarhus or {}
  local colour=str(opts.colour,'dark-blue')
  choice(colour,palette,'aarhus.colour')
  local orcidColour=choice(str(opts['orcid-colour'],'brand'),{brand=true,theme=true},'aarhus.orcid-colour')
  local ratio=str(opts['aspect-ratio'],'16:9')
  local heights={['16:9']=540,['16:10']=600,['4:3']=720}
  choice(ratio,heights,'aarhus.aspect-ratio')
  local height=heights[ratio]
  local input = pandoc.read(read(quarto.doc.input_file), 'markdown').meta
  local inputFormat = type(input.format)=='table' and input.format['aarhus-revealjs'] or {}
  if type(inputFormat)~='table' then inputFormat={} end
  local defaults={width=960,height=0}
  for key,expected in pairs({width=960,height=height}) do
    local value=m[key] or quarto.doc.option(key)
    if value and tonumber(str(value))~=expected and (tonumber(str(value))~=defaults[key] or input[key] or inputFormat[key]) then fail(key..' conflicts with aarhus.aspect-ratio; remove it or use '..expected) end
    m[key]=pandoc.MetaString(tostring(expected))
  end
  for _,key in ipairs({'title-layout','title-image','title-image-alt'}) do
    if opts[key] then fail('aarhus.'..key..' is not supported. Use native Quarto title-slide-attributes, columns and figures; see template.qmd.') end
  end
  local section=choice(str(opts['section-style'],'plain'),{plain=true,peto=true,seal=true},'aarhus.section-style')
  local ending=choice(str(opts['end-slide'],'none'),{none=true,logo=true,peto=true,wordmark=true},'aarhus.end-slide')
  local presenter=m.presenter or {}
  config={colour=palette[colour],colourName=colour,foreground=luminance(palette[colour])>0.179 and '#000000' or '#ffffff',
    width=960,height=height,ratio=ratio,sectionStyle=section,ending=ending,orcidColour=orcidColour,
    event=textmeta(m.event),date=textmeta(m.date),presenter=textmeta(presenter.name),
    presenterTitle=textmeta(presenter.title),institute=textmeta(presenter.institute),assets={}}
  for _,name in ipairs({'mark-black','mark-white','seal-black','seal-white','quote'}) do
    config.assets[name]=data(root..'/assets/'..name..'.svg','image/svg+xml')
  end
  local linkColour = 1.05/(luminance(config.colour)+0.05)>=4.5 and config.colour or palette['dark-'..colour] or '#000000'
  local css=':root{--au-orcid-colour:'..(orcidColour=='brand' and '#a6ce39' or 'currentColor')..';--au-link-colour:'..linkColour..';--au-colour:'..config.colour..';--au-on-colour:'..config.foreground..';--au-height:'..height..'px;--au-extra:'..(height-540)..'px;}'
  local fonts={
    {'AUPassata_Rg.ttf','AU Passata',400,'normal'}, {'AUPassata_Bold.ttf','AU Passata',700,'normal'},
    {'AUPass_RgOblique.ttf','AU Passata',400,'italic'}, {'AUPass_BoldOblique.ttf','AU Passata',700,'italic'},
    {'AUPassata_Light.ttf','AU Passata Light',300,'normal'},
    {'AUPassLight_Bold.ttf','AU Passata Light',700,'normal'},
    {'AUPassLight_BoldOblique.ttf','AU Passata Light',700,'italic'}, {'AUPassLight_Oblique.ttf','AU Passata Light',300,'italic'},
    {'AU_Peto.ttf','AU Peto',400,'normal'}}
  -- Bundled web fonts are the default; font-dir remains a complete override.
  local override=str(opts['font-dir'])
  local dir=override or (root..'/assets/fonts')
  for _,f in ipairs(fonts) do
    local name=f[1]:gsub('%.ttf$', '.woff2')
    local path=dir..'/'..name
    local probe=io.open(path,'rb')
    local mime,format='font/woff2','woff2'
    if probe then probe:close()
    elseif override then
      path=dir..'/'..f[1]
      mime,format='font/ttf','truetype'
    end
    css=css..'@font-face{font-family:"'..f[2]..'";font-weight:'..f[3]..';font-style:'..f[4]..';font-display:block;src:url("'..data(path,mime)..'") format("'..format..'");}'
  end
  config.embeddedFonts=true
  local encoded=quarto.json.encode(config):gsub('<','\\u003c')
  local includes=m['header-includes'] or pandoc.MetaList({})
  if pandoc.utils.type(includes)~='List' then includes=pandoc.MetaList({includes}) end
  includes:insert(pandoc.MetaBlocks({pandoc.RawBlock('html','<style>'..css..'</style><script id="au-config" type="application/json">'..encoded..'</script>')}))
  m['header-includes']=includes
  return m
end
local function header(h)
  if h.level>2 then return end
  if h.attributes['au-layout'] then fail('au-layout is not supported. Use ordinary headings, columns and figure panels; see template.qmd.') end
  if h.level==1 then
    h.attributes['data-au-layout']='section'
    h.attributes['data-au-motif']=choice(h.attributes['au-motif'] or config.sectionStyle,{plain=true,peto=true,seal=true},'au-motif')
  end
  h.attributes['au-motif']=nil
  if h.attributes['au-footer'] then
    local v=choice(h.attributes['au-footer'],{['true']=true,['false']=true},'au-footer')
    h.attributes['data-au-footer']=v; h.attributes['au-footer']=nil
  end
  h.classes:insert('au-slide')
  return h
end
return {{Meta=meta},{Header=header},{Pandoc=function(doc)
  if config.ending~='none' then
    local h=pandoc.Header(2,'Aarhus University',pandoc.Attr('au-ending',{'au-slide'},{['data-au-layout']='end-'..config.ending,['data-au-motif']='plain'}))
    doc.blocks:insert(h)
  end
  return doc
end}}
