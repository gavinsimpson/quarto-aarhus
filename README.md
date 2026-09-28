# Quarto Aarhus

## Non-endorsement disclaimer

**Unofficial project:** This extension is independently developed and maintained. It is **not an official product of Aarhus University**. Aarhus University does not own this extension and takes no responsibility for the project or its use. AU fonts are redistributed with permission; this permission does not imply university ownership or endorsement.

Aarhus University’s logo and visual identity may only be used for official organisational purposes or with its express authorisation.

## Extension

An Aarhus University Reveal.js format based on the official PowerPoint template. It provides AU typography, colour, margins, section slides, slide-local branding, and portable AU font embedding. Create slide decks and presentation with native Quarto Markdown that conform to the visual design language of Aarhus University.

[Documentation and live example](https://gavinsimpson.github.io/quarto-aarhus/) · [Changelog](CHANGELOG.md) · [Testing](TESTING.md)

## Install and start

```sh
quarto add gavinsimpson/quarto-aarhus
# Or create a new presentation with the starter document:
quarto use template gavinsimpson/quarto-aarhus
```

Use `template.qmd` as the starter and example deck. Quarto 1.5 or newer is required. This is an unofficial implementation; AU artwork retains its own usage conditions.

```yaml
---
title: "Ecology and evolution"
subtitle: "Research seminar"
format: aarhus-revealjs
author:
  - name: Your Name
    affiliations: Your Department
    email: jane-doe@dept.au.dk
    orcid: 0000-0000-0000-0000  # Placeholder: replace with your own ORCID
date: 2026-09-27
event: Department seminar
presenter:
  name: Your Name
  title: Associate Professor
  institute: Department of Example Studies
aarhus:
  colour: dark-magenta
  orcid-colour: brand
  aspect-ratio: "16:10"
  section-style: plain
  end-slide: peto
---
```

## Theme options

All options below go under `aarhus:`. No SCSS editing is required.

| Option | Default | Values / meaning |
|---|---|---|
| `colour` | `dark-blue` | Named colour from the palette below |
| `orcid-colour` | `brand` | `brand` for ORCID green; `theme` to inherit title-slide foreground colour |
| `aspect-ratio` | `"16:9"` | `"16:9"`, `"16:10"`, `"4:3"` |
| `section-style` | `plain` | `plain`, `peto`, `seal` |
| `end-slide` | `none` | `none`, `logo`, `peto`, `wordmark`; append an ending automatically |
| `font-dir` | bundled fonts | Optional directory overriding all nine AU font faces below |

Choose bright and dark colours separately, for example `blue` or `dark-blue`. Theme colour controls coloured title/section/ending backgrounds and links; ordinary slide text, rules, and branding retain the source's black/white treatments. Foregrounds on coloured slides are selected for contrast; links on white slides use the dark variant when the selected colour would be too light.

| Colour | Hex | Dark variant | Hex |
|---|---|---|---|
| blue | `#003d73` | dark-blue | `#002546` |
| purple | `#655a9f` | dark-purple | `#281c41` |
| cyan | `#37a0cb` | dark-cyan | `#003e5c` |
| turquoise | `#00aba4` | dark-turquoise | `#004543` |
| green | `#8bad3f` | dark-green | `#425821` |
| yellow | `#fabb00` | dark-yellow | `#634b03` |
| orange | `#ee7f00` | dark-orange | `#5f3408` |
| red | `#e2001a` | dark-red | `#5b0c0c` |
| magenta | `#e2007a` | dark-magenta | `#5f0030` |
| grey | `#878787` | dark-grey | `#4b4b4a` |

`black` and `white` are also accepted. See [AU colour guidance](https://medarbejdere.au.dk/en/administration/communication/guidelines/guidelinesforcolours). All 20 palette values have been checked against the RGB values used by the official page's clickable colour swatches.

Logical slide dimensions are 960 × 540, 960 × 600, or 960 × 720. The taller formats preserve typography and horizontal geometry while adding vertical room. Prefer `aspect-ratio` over Reveal `width`/`height`; conflicting explicit dimensions fail validation.

## Fonts and portable output

All eight AU Passata styles and AU Peto are bundled as WOFF2 web fonts and embedded automatically into every rendered deck. Neither authors nor viewers need locally installed AU fonts or a remote font server. The full character sets are retained.

Optionally, set `aarhus.font-dir` to override the bundled fonts. Supply all nine faces using the following TTF filenames or the same names with a `.woff2` extension:

```text
AUPassata_Rg.ttf
AUPassata_Bold.ttf
AUPass_RgOblique.ttf
AUPass_BoldOblique.ttf
AUPassata_Light.ttf
AUPassLight_Bold.ttf
AUPassLight_BoldOblique.ttf
AUPassLight_Oblique.ttf
AU_Peto.ttf
```

The override directory is relative to the input document; absolute paths are supported. WOFF2 is preferred when both formats are present for a face. Font files are embedded as data URLs in the generated HTML, even without `embed-resources: true`. A missing bundled or override font is a render error. If a browser cannot load AU Peto, Peto decorations use the AU seal. Font Awesome icon fonts are bundled under their separate licence.

To include other supporting resources in a single HTML file:

```yaml
format:
  aarhus-revealjs:
    embed-resources: true
```

Remote videos, widgets, and externally configured mathematics engines retain their own network requirements.

## Authoring slides

Use `##` for ordinary slides and `#` for section dividers. Titles line up with the short rule and the content margin. Wrapped titles move the rule and content down automatically.

The starter demonstrates text/image columns, two and three pictures, custom figure panels, quotations, tables, mathematics, fragments and speaker notes. Images stay in Quarto's figure structure, preserving captions and alternative text. Replace the native placeholder shortcode with your own image path when ready.

```markdown
## Two pictures

::: {layout-ncol=2}
{{< placeholder 380 250 format=svg >}}

{{< placeholder 380 250 format=svg >}}
:::

# Next topic {au-motif="peto"}
```

Use [Quarto figure panels](https://quarto.org/docs/authoring/figures.html#figure-panels), [placeholder images](https://quarto.org/docs/authoring/placeholder.html), and ordinary `.columns` / `.column` divisions to arrange slide content. Native `title-slide-attributes` can customise the title slide. Solid `background-color` overrides automatically select contrasting text, logo and seal treatments:

```markdown
## A dark slide {background-color="#123456"}

Text and branding use white for contrast.
```

The AU-specific `section-style` option applies to level-one headings; `au-motif="plain"`, `"peto"`, or `"seal"` overrides an individual section. Peto spells the visible heading and is hidden from screen readers. `end-slide` selects the optional final AU branding composition. With AU Peto available, the Peto ending combines decorative glyphs with a nearby readable university name, following [AU's Peto guidance](https://medarbejdere.au.dk/en/administration/communication/guidelines/thefifthelement).

## Title-slide authors

Use Quarto's `author` metadata for the title slide. Each author can have a name, email, ORCID and one or more affiliations. ORCIDs appear as a linked identifier with the ORCID iD icon; missing fields are omitted. Quarto's shared affiliation references are supported. The ORCID icon uses the bundled [Font Awesome extension](https://github.com/quarto-ext/fontawesome); no separate installation is needed. Its `{{< fa brands orcid >}}` and other icon shortcodes are also available in slide content.

```yaml
author:
  - name: Joe Bloggs
    orcid: 0000-0000-0000-0000
    email: joe-blogs@dept.au.dk
    affiliations: Aarhus University
  - name: Jane Doe
    orcid: 0000-0000-0000-0000
    email: jane-doe@dept.au.dk
    affiliations: Aarhus University
presenter:
  name: Joe Bloggs
  institute: Department Name
```

Select the ORCID icon treatment in YAML:

```yaml
aarhus:
  orcid-colour: brand  # or theme
```

`brand` uses ORCID green (`#a6ce39`). `theme` follows the title-slide text colour (usually white on dark AU backgrounds and black on light backgrounds), so the icon remains visible. The identifier and link retain the surrounding text colour.

`author` describes who created the presentation; `presenter` independently describes who is presenting it in the footer. With no `presenter` block, the presenter's footer fields remain empty even when authors are supplied.

## Footers and standard Quarto content

`event`, `date`, `presenter.name`, `presenter.title`, and `presenter.institute` are optional. Presenter fields are used only in the footer; they never fall back to author metadata. Empty fields produce no placeholder text. Logo/institution appear at bottom left, event/date and presenter near the middle, and the seal at bottom right. Slide numbers occupy the source position below the seal.

Add `au-footer="false"` to a heading to omit the footer on that slide.

```markdown
## A slide without a footer {au-footer="false"}

Your slide content goes here.
```

Setting `aarhus.end-slide` to `logo`, `peto`, or `wordmark` automatically appends a final AU branding slide. This ending shows the selected branding composition without the usual footer: the corner logo/institution block, event/date, presenter details and corner seal are omitted. It also has no slide number. The default, `end-slide: none`, adds no ending slide.

Place `end-slide` under `aarhus` in the YAML front matter at the top of your `.qmd` file:

```markdown
---
title: "My presentation"
format: aarhus-revealjs
aarhus:
  end-slide: peto  # Options: none, logo, peto, wordmark
---

## My final content slide

Thank you for listening.
```

In this example, the extension adds the Peto branding slide after your final content slide. You do not need to write a heading or content for the ending yourself.

Standard columns, code, equations, tables, fragments, and notes remain Quarto content.

## Troubleshooting layout issues

Content is never automatically shrunk. Oversized headings, content, and metadata are reported in the browser console with the slide identifier. Separate material into more slides or adjust native columns and figure sizes when it overflows.

To inspect these warnings, open the rendered HTML presentation in a web browser, open its Developer Tools, and select the **Console** tab. In Chrome or Edge, you can open Developer Tools by right-clicking the page and choosing **Inspect**.

Checks run automatically when the presentation opens and when the browser is resized. If interactive content changes after loading, type the following JavaScript into the browser console and press Enter to check again:

```javascript
window.auCheck()
```

The command returns a list of detected overflow problems, including slide identifiers, and logs warnings in the console. An empty list (`[]`) means no overflow was detected. To view the results of the most recent check without running it again, enter:

```javascript
window.auDiagnostics
```

These commands are optional troubleshooting tools. Run them in the browser console, not in your `.qmd` file, YAML, R console, or terminal.

Use Reveal's normal PDF export (`?print-pdf`). Branding is part of each slide and remains attached during scaling, overview, and printing.

## Development and validation

The extension requires only Quarto. Node.js and Playwright are development tools for browser tests:

```sh
npm ci
npx playwright install chromium
npm test
python3 tests/install.py
```

Public CI checks the bundled AU fonts offline. To additionally check a font-directory override, run `AU_FONT_DIR=/path/to/au-fonts npm test`.

See [TESTING.md](TESTING.md) for the browser matrix, PDF checks, documentation build and release process, and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## Citation and licences

Citation metadata is available in [CITATION.cff](CITATION.cff). Extension code is MIT-licensed; AU artwork and bundled dependencies retain their own [licence notices](_extensions/aarhus/assets/NOTICE.md). AU fonts are redistributed with permission and are not covered by the MIT software licence.
