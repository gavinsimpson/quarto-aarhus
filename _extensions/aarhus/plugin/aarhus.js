/* Slide-local chrome deliberately lives inside Reveal's scaled canvas. */
const RevealAarhus = (() => {
  const node = (tag, className, text) => {
    const el = document.createElement(tag); el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const image = (config, name, className, alt = '') => {
    const el = node('img', className); el.src = config.assets[name]; el.alt = alt;
    return el;
  };
  const darkLayouts = new Set(['title', 'section', 'end-logo', 'end-peto', 'end-wordmark']);
  // A missing font can make FontFaceSet.check() succeed through fallback.
  // Compare against two fallback families as well, including installed fonts.
  function hasFont(family) {
    if (!document.fonts.check(`32px "${family}"`)) return false;
    const context = document.createElement('canvas').getContext('2d');
    const sample = 'Aarhus uni versiet MWim0123456789';
    return ['monospace', 'serif'].some(fallback => {
      context.font = `32px ${fallback}`;
      const baseline = context.measureText(sample).width;
      context.font = `32px "${family}", ${fallback}`;
      return Math.abs(context.measureText(sample).width - baseline) > 0.1;
    });
  }
  function foreground(background, fallback) {
    const probe = document.createElement('span');
    probe.style.color = background; document.body.append(probe);
    const channels = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number);
    probe.remove();
    if (!channels || channels.length < 3) return fallback;
    // Composite translucent colours over the default white slide canvas.
    const alpha = channels[3] ?? 1;
    const rgb = channels.slice(0,3).map(c => (c * alpha + 255 * (1-alpha)) / 255)
      .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722 > .179 ? '#000000' : '#ffffff';
  }
  function footer(config, colour) {
    const f = node('footer', 'au-footer');
    const brand = node('div', 'au-brand');
    brand.append(image(config, 'mark-' + colour, 'au-mark'));
    const names = node('div', 'au-brand-names');
    if (config.institute) names.append(node('div', 'au-institute', config.institute));
    names.append(node('div', 'au-university', 'Aarhus University')); brand.append(names); f.append(brand);
    const event = node('div', 'au-event');
    if (config.event) event.append(node('div', 'au-footer-field au-event-name', config.event));
    if (config.date) event.append(node('div', 'au-footer-field au-date', config.date));
    f.append(event);
    const presenter = node('div', 'au-presenter');
    if (config.presenter) presenter.append(node('div', 'au-footer-field au-presenter-name', config.presenter));
    if (config.presenterTitle) presenter.append(node('div', 'au-footer-field au-presenter-title', config.presenterTitle));
    f.append(presenter);
    if (event.textContent && presenter.textContent) f.append(node('div', 'au-separator'));
    f.append(image(config, 'seal-' + colour, 'au-seal', 'Aarhus University seal'));
    return f;
  }
  function arrange(slide, config, index) {
    if (slide.dataset.auReady) return;
    slide.dataset.auReady = 'true'; slide.classList.add('au-slide');
    const layout = slide.dataset.auLayout || 'content'; slide.dataset.auLayout = layout;
    slide.append(node('div', 'au-rule'));
    const heading = slide.querySelector(':scope > h1, :scope > h2');
    if (heading) {
      heading.classList.add(layout.startsWith('end-') ? 'au-visually-hidden' : 'au-heading');
      const text = node('span','au-heading-text');
      while (heading.firstChild) text.append(heading.firstChild);
      heading.append(text);
    }
    let content = slide.querySelector(':scope > .au-content');
    if (!content) {
      content = node('div', 'au-content');
      for (const child of [...slide.childNodes]) {
        if (child === heading || (child.nodeType === 1 && child.matches('aside.notes, .speaker-notes, .au-rule'))) continue;
        content.append(child);
      }
      slide.append(content);
    }
    const coloured = darkLayouts.has(layout);
    const background = slide.dataset.backgroundColor || (coloured ? config.colour : '#ffffff');
    const textColour = foreground(background, config.foreground);
    const colour = textColour === '#ffffff' ? 'white' : 'black';
    slide.classList.toggle('au-coloured', coloured);
    slide.classList.toggle('au-custom-background', !!slide.dataset.backgroundColor);
    slide.style.color = textColour;
    slide.style.setProperty('--au-on-colour', textColour);
    // Reveal backgrounds fill the surrounding screen; slide backgrounds print.
    if (coloured && !slide.dataset.backgroundColor) slide.dataset.backgroundColor = background;
    if (slide.dataset.backgroundColor) slide.style.backgroundColor = background;
    if (slide.dataset.backgroundImage) slide.style.background = 'transparent';
    for (const quote of content.querySelectorAll('blockquote')) quote.prepend(image(config, 'quote', 'au-quote-mark'));
    if (layout === 'section') {
      const requested = slide.dataset.auMotif || config.sectionStyle;
      const motif = requested === 'peto' && !config.petoAvailable ? 'seal' : requested;
      slide.dataset.auRenderedMotif = motif;
      if (motif === 'peto') {
        const text = heading?.textContent || '';
        const peto = node('div', 'au-section-peto', text); peto.setAttribute('aria-hidden','true'); slide.append(peto);
      } else if (motif === 'seal') slide.append(image(config, 'seal-' + colour, 'au-section-seal'));
    }
    if (layout === 'end-peto') {
      if (!config.petoAvailable) {
        slide.dataset.auEndingFallback = 'seal';
        slide.append(image(config, 'seal-' + colour, 'au-end-logo', 'Aarhus University seal'));
      } else {
      const peto = node('div', 'au-peto-ending'); peto.setAttribute('aria-hidden', 'true');
      for (const [cls,text] of [['au-peto-aarhus','Aarhus'],['au-peto-uni','uni'],['au-peto-versiet','versiet']]) peto.append(node('span',cls,text));
      slide.append(peto, node('div','au-peto-caption','Aarhus Universitet'));
      }
    } else if (layout === 'end-logo') {
      slide.append(image(config, 'mark-' + colour, 'au-end-logo', 'Aarhus University'));
    } else if (layout === 'end-wordmark') {
      const ending = node('div', 'au-end-wordmark');
      ending.append(image(config, 'mark-' + colour, '', 'Aarhus University'));
      ending.append(node('div','','Aarhus University')); slide.append(ending);
    }
    const visible = slide.dataset.auFooter ? slide.dataset.auFooter === 'true' : !layout.startsWith('end-');
    slide.classList.toggle('au-has-footer', visible);
    if (visible) slide.append(footer(config, colour));
    if (!layout.startsWith('end-')) slide.append(node('span','au-page-number',String(index + 1)));
  }
  function diagnostics(deck, config) {
    const problems = [];
    const slides = deck.getSlides();
    for (const [i, slide] of slides.entries()) {
      // Reveal removes non-current slides from layout. Measure them without changing navigation.
      const stack = slide.parentElement.tagName === 'SECTION' ? slide.parentElement : null;
      const stackStyle = stack?.getAttribute('style');
      if (stack) stack.style.display = 'block';
      const before = slide.getAttribute('style');
      slide.style.display = 'block';
      if (slide.dataset.auLayout === 'content') {
        const heading = slide.querySelector('.au-heading');
        const height = heading ? heading.scrollHeight : 0;
        const extra = Math.max(0, height - 59.22);
        slide.style.setProperty('--au-heading-extra', extra + 'px');
        slide.classList.toggle('au-no-heading', !heading);
      }
      for (const el of slide.querySelectorAll('.au-content, .au-heading, .au-event, .au-presenter, .au-brand-names, .au-footer-field, .au-end-wordmark, .au-section-peto')) {
        const tolerance = el.classList.contains('au-heading') ? 8 : 2;
        const headingHeight = el.classList.contains('au-heading') ? el.firstElementChild?.getBoundingClientRect().height / deck.getScale() : 0;
        if ((el.scrollHeight > el.clientHeight + tolerance || headingHeight > el.clientHeight + tolerance || (el.classList.contains('au-heading') && el.clientHeight > config.height - 180) || el.scrollWidth > el.clientWidth + 2)) {
          problems.push({slide:i + 1,id:slide.id,layout:slide.dataset.auLayout,element:el.className,kind:'overflow'});
        }
      }
      const extra = slide.style.getPropertyValue('--au-heading-extra');
      if (before === null) slide.removeAttribute('style'); else slide.setAttribute('style', before);
      if (extra) slide.style.setProperty('--au-heading-extra', extra);
      if (stack) { if (stackStyle === null) stack.removeAttribute('style'); else stack.setAttribute('style', stackStyle); }
    }
    window.auDiagnostics = problems;
    for (const issue of problems) console.warn('Aarhus:', issue);
    document.dispatchEvent(new CustomEvent('aarhus:checked',{detail:problems}));
    return problems;
  }
  return {id:'aarhus', async init(deck) {
    const config = JSON.parse(document.getElementById('au-config').textContent);
    deck.configure({width:config.width,height:config.height,center:false,margin:0});
    await Promise.all([
      document.fonts.load('20px "AU Passata"'), document.fonts.load('700 60px "AU Passata Light"'),
      document.fonts.load('100px "AU Peto"')
    ]);
    await document.fonts.ready;
    config.petoAvailable = hasFont('AU Peto');
    if (!config.petoAvailable && (config.sectionStyle === 'peto' || config.ending === 'peto' ||
        deck.getSlides().some(s => s.dataset.auMotif === 'peto'))) {
      console.warn('Aarhus: AU Peto is unavailable; using the AU seal for Peto decorations.');
    }
    // Before Reveal initialises stacks, getSlides also includes their containers.
    deck.getSlides().filter(s => !s.querySelector(':scope > section')).forEach((s,i) => arrange(s,config,i));
    const check = () => {deck.layout(); requestAnimationFrame(() => diagnostics(deck,config));};
    deck.on('ready',check); deck.on('resize',check); deck.on('pdf-ready',check);
    window.auCheck = () => diagnostics(deck,config);

  }};
})();
