# Testing and release checks

## Public automated tests

Requirements: Quarto 1.5 or newer, Python 3, Node.js 22 or newer, and the development dependencies:

```sh
npm ci
npx playwright install chromium firefox webkit
npm test
```

On Linux use `npx playwright install --with-deps chromium firefox webkit` to install browser system dependencies too. No AU fonts, R packages, account credentials or network resources in the rendered deck are required.

The renderer creates isolated projects in `.build/`, copies the extension, renders fixtures and checks invalid inputs. Chrome checks all three aspect ratios, two AU colours, authors and ORCID modes, every ending, custom background contrast, missing-font fallback, image loading, native panel alignment, navigation, overview and overflow diagnostics. It also exports PDFs. Firefox and WebKit exercise the same HTML assertions; PDF generation is Chromium-only.

```sh
AU_BROWSER=firefox node tests/browser.cjs
AU_BROWSER=webkit node tests/browser.cjs
python3 tests/install.py
```

CI runs on Quarto 1.5.57 and the current release. It tests Chromium on both and Firefox/WebKit on the current release. A separate job builds the documentation and checks packaged installation. Pull requests only build the site; deployment runs after pushes to `main` or manual dispatch.

## Optional AU-font fidelity checks

Fonts must be obtained separately under AU's usage conditions. Never commit them or upload font-embedded artifacts to a public CI job or Pages site.

```sh
AU_FONT_DIR=/path/to/au-fonts npm test
```

You can use installed Chrome with `CHROME_CHANNEL=chrome`. `PLAYWRIGHT_MODULE` can point to an existing Playwright package. `AU_BUILD_DIR` selects the browser fixture directory; the renderer accepts `--build-dir` and `--quarto`.

Screenshots and results are saved under `.build/`. The `missing-fonts` fixture renames the AU font lookups to deliberately nonexistent families, ensuring fallback is tested even on a machine with AU fonts installed.

## Documentation preview

From the repository root:

```sh
python3 tools/build-docs.py
quarto preview docs
```

Run `npm run test:site` after building to check local links and the live deck in Chromium.

The build script stages the extension before Quarto reads the project, generates the reference from README, and creates the live deck from `template.qmd`. Generated copies are ignored by Git. The public build never enables AU font embedding.

## Manual release review

- Inspect the starter in Chrome, Firefox and Safari (WebKit CI is useful but is not a substitute for actual Safari).
- Check keyboard navigation, visible focus, author and ORCID links, figures and speaker notes.
- Inspect the PDF for each aspect ratio, particularly wrapping titles, figure panels and footers.
- With AU fonts available, check Passata styles and Peto artwork against AU's templates.
- Review image-background slides manually: contrast is calculated from solid background colours, not from the pixels in photographs.
- Ensure the README, extension version, changelog, citation and release tag agree.
- Run the installation check from a clean checkout and review the release archive contents.
- Confirm no AU fonts, private reference files, or font-embedded build artifacts are included.

## Publishing

The `Pages` workflow uses GitHub Actions deployment. Enable Pages with **Source: GitHub Actions** in the repository settings. The website is built from `docs/` and deployed at `https://gavinsimpson.github.io/quarto-aarhus/`.

For a release, wait for CI to pass, tag the tested commit `v0.1.0`, push the tag, and create the GitHub release using CHANGELOG.md. Do not tag a commit before its release checks pass.
