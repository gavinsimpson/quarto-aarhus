# Testing and release checks

## Public automated tests

Requirements: Quarto 1.5 or newer, Python 3, Node.js 22 or newer, and the development dependencies:

```sh
npm ci
npx playwright install chromium firefox webkit
npm test
```

On Linux use `npx playwright install --with-deps chromium firefox webkit` to install browser system dependencies too. No locally installed AU fonts, R packages, account credentials or network resources in the rendered deck are required.

The renderer creates isolated projects in `.build/`, copies the extension, renders fixtures and checks invalid inputs. Chrome checks all three aspect ratios, two AU colours, authors and ORCID modes, every ending, custom background contrast, missing-font fallback, image loading, native panel alignment, navigation, overview and overflow diagnostics. It also exports PDFs. Firefox and WebKit exercise the same HTML assertions; PDF generation is Chromium-only.

```sh
AU_BROWSER=firefox node tests/browser.cjs
AU_BROWSER=webkit node tests/browser.cjs
python3 tests/install.py
```

CI runs on Quarto 1.5.57 and the current release. It tests Chromium on both and Firefox/WebKit on the current release. A separate job builds the documentation and checks packaged installation. Pull requests only build the site; deployment runs after pushes to `main` or manual dispatch.

## Font checks and conversion

The default tests use bundled WOFF2 fonts. To check a complete font-directory override (WOFF2 or TTF), run:

```sh
AU_FONT_DIR=/path/to/au-fonts npm test
```

To regenerate the bundled fonts, install `fonttools[woff]==4.66.0` in a development environment and run `python3 tools/build-fonts.py /path/to/au-ttf-fonts`. Conversion preserves all glyphs and font metadata; users do not need conversion tools.

You can use installed Chrome with `CHROME_CHANNEL=chrome`. `PLAYWRIGHT_MODULE` can point to an existing Playwright package. `AU_BUILD_DIR` selects the browser fixture directory; the renderer accepts `--build-dir` and `--quarto`.

Screenshots and results are saved under `.build/`. The `missing-fonts` fixture removes embedded font-face rules and renames the AU font lookups to deliberately nonexistent families, ensuring fallback is tested even on a machine with AU fonts installed.

## Documentation preview

From the repository root:

```sh
python3 tools/build-docs.py
quarto preview docs
```

Run `npm run test:site` after building to check local links and the live deck in Chromium.

The build script stages the extension before Quarto reads the project, generates the reference from README, and creates the live deck from `template.qmd`. Generated copies are ignored by Git. The public build embeds the bundled AU fonts.

## Manual release review

- Inspect the starter in Chrome, Firefox and Safari (WebKit CI is useful but is not a substitute for actual Safari).
- Check keyboard navigation, visible focus, author and ORCID links, figures and speaker notes.
- Inspect the PDF for each aspect ratio, particularly wrapping titles, figure panels and footers.
- Check bundled Passata styles and Peto artwork against AU's templates.
- Review image-background slides manually: contrast is calculated from solid background colours, not from the pixels in photographs.
- Ensure the README, extension version, changelog, citation and release tag agree.
- Run the installation check from a clean checkout and review the release archive contents.
- Confirm the nine approved WOFF2 fonts and their notices are included; exclude private reference files and generated build artifacts.

## Publishing

The `Pages` workflow uses GitHub Actions deployment. Enable Pages with **Source: GitHub Actions** in the repository settings. The website is built from `docs/` and deployed at `https://gavinsimpson.github.io/quarto-aarhus/`.

The release metadata and installation examples target 0.2.0. To publish this release:

1. Confirm that the extension and citation versions are `0.2.0`, both the citation and changelog contain the actual release date, and README and getting-started installation commands use `@v0.2.0`. If publication is delayed, update the date before merging.
2. Complete the manual review, merge the release-preparation changes, and wait for CI and Pages to pass on that exact `main` commit. Pages rebuilds and deploys the documentation and example deck; do not commit generated site files.
3. Create an annotated `v0.2.0` tag on the tested commit and push the tag. Publish a GitHub Release titled "Quarto Aarhus 0.2.0", using the 0.2.0 changelog entry as release notes, and mark it as the latest release. The current workflows do not create tags or GitHub Releases.
4. Verify both `quarto add gavinsimpson/quarto-aarhus@v0.2.0` and `quarto use template gavinsimpson/quarto-aarhus@v0.2.0` in fresh directories and render the resulting decks.
5. Submit the Quarto listing PR below after the release is published and verified.

## Quarto extension listing

Follow the upstream [listing instructions](https://github.com/quarto-dev/quarto-web/tree/main/docs/extensions/listings). They require a GitHub repository, a README with installation and usage examples, and an explicit open-source licence. This repository provides those; the MIT software licence and separate AU artwork notices are documented in the README.

After 0.2.0 is released, use the `gavinsimpson/quarto-web` fork to create a branch from current upstream `main`. Add this entry in alphabetical order to `docs/extensions/listings/revealjs-formats.yml`:

```yaml
- name: aarhus-revealjs
  path: https://github.com/gavinsimpson/quarto-aarhus
  author: '[Gavin L. Simpson](https://github.com/gavinsimpson)'
  description: >
    An unofficial Aarhus University Reveal.js format based on the university's
    PowerPoint template, with AU colours, author metadata and presenter footers.
```

Open a PR against `quarto-dev/quarto-web:main`, titled `Add aarhus-revealjs to extension listings`. Link the 0.2.0 release, documentation and live example in the PR description. Submit only the listing addition after the 0.2.0 release is published and verified.
