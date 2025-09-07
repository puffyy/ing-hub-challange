# ING Hubs Turkey Challenge — Lit HR App (100% Unit Test Coverage)

A small **Lit** web app that showcases an HR module (employee list, employee form, shared UI components) with **comprehensive unit tests** using **@web/test-runner**, **Playwright**, **open-wc**, and **Sinon**.

> This repository is prepared for the **ING Hubs Turkey Challenge**. All test messages and code comments are in **English**, per challenge requirements.

---

## Quick start

```bash
# 1) Install dependencies
npm i

# 2) Install Playwright browsers (required by @web/test-runner-playwright)
npx playwright install

# 3) Start the dev server (serves the app)
npm run start

# 4) Run the tests in all configured browsers
npm test

# Optional: watch mode
npm run test:watch

# Optional: run tests in a single browser (useful locally/CI)
BROWSERS=chromium npm test
```

> If you see an error like `browserType.launch: Executable doesn't exist…`, it means Playwright browsers are missing. Run `npx playwright install`.

---

## Tech stack

- **Lit** for Web Components
- **@web/dev-server** & **@web/test-runner**
- **@web/test-runner-playwright** (Chromium/Firefox/WebKit)
- **open-wc testing** utilities (`fixture`, `expect`, `oneEvent`, `aTimeout`, etc.)
- **Sinon** (stubs/spies — see ESM notes below)
- **zustand (vanilla)** + **idb** for persistence
- **V8 coverage** plugin (coverage thresholds set to **100%**)

---

## Scripts

```json
{
  "scripts": {
    "start": "wds --config web-dev-server.config.js",
    "test": "wtr --config web-test-runner.config.js",
    "test:watch": "wtr --watch --config web-test-runner.config.js",
    "test:ci": "MODE=prod BROWSERS=chromium wtr --coverage --config web-test-runner.config.js"
  }
}
```

- `MODE=dev|prod` is used by the runner for different `nodeResolve.exportConditions`.
- Limit browsers with `BROWSERS=chromium`, `BROWSERS=firefox`, or `BROWSERS=webkit`.

---

## Project layout

```
src/
  app-root.js
  router.js
  i18n/
    i18n.js        # loads en.json / tr.json and emits 'i18n-changed'
    en.json
    tr.json
  components/
    employee-form.js
    employee-list.js
    pages/
      page-employees.js
      page-employee-edit.js
    shared/
      confirm-dialog.js
      pagination.js
      search-input.js
      hr-header.js
      hr-nav.js
  store/
    employees.store.js
    storage.idb.js
  utils/
    css.js
    seed.js
    validation.js

test/
  components/
    employee-form.test.js
    employee-list.test.js
    shared/
      confirm-dialog.test.js
      pagination.test.js
      search-input.test.js
  pages/
    page-employees.test.js
    page-employee-edit.test.js
  store/
    employees.store.test.js
  utils/
    css.test.js
    seed.test.js
    validation.test.js
```

Tests are discovered with both patterns:

- `test/**/*_test.js`
- `test/**/*.test.js`

---

## Running specific tests

```bash
# Single file
wtr --config web-test-runner.config.js --files "test/components/shared/pagination.test.js"

# Grep by name (Mocha tdd style)
wtr --config web-test-runner.config.js --grep "pagination"

# Debug in a real browser
wtr --config web-test-runner.config.js --manual
# then open the shown URL, select tests, use DevTools
```

---

## Coverage (100%)

Coverage is enforced to **100%** for statements, branches, functions, and lines using the V8 coverage plugin configured in `web-test-runner.config.js`.

Reports are written to `coverage/`:

- **Text summary** in the terminal
- **HTML** report in `coverage/`
- **lcov** for CI tools

Open the HTML report with:

```bash
open coverage/index.html
```

If coverage fails, open the HTML report to see exactly which lines/branches are missing tests.

---

## Testing guidance & conventions

### 1) Do **not** stub live ESM imports directly

Stubbing a live ESM binding throws `TypeError: ES Modules cannot be stubbed`.

Use **test seams** instead:

- Expose **static indirections** on classes for things you want to stub.

  ```js
  // employee-form.js
  import {validateEmployee as _validateEmployee} from '../utils/validation.js';
  import {confirm as _confirm} from './shared/confirm-dialog.js';

  export class EmployeeForm extends LitElement {
    static validateImpl = _validateEmployee;
    static confirmImpl = _confirm;
    // ...
  }
  ```

  In tests:

  ```js
  sinon.stub(EmployeeForm, 'validateImpl').returns([]);
  sinon.stub(EmployeeForm, 'confirmImpl').resolves(true);
  ```

- Stub **instance methods** after creating the element (e.g. `sinon.spy(el, '_cancel')`).

- For the **store**, stub the API returned by `employeesStore.getState()`.

### 2) Stub `fetch` for CSS and i18n

- `adoptCss()` loads CSS files → return a small `/* test css */` response.
- `i18n/i18n.js` loads `en.json` / `tr.json` → return minimal JSON with strings used in tests.

This keeps tests fast and offline-friendly.

### 3) Prevent real navigation

- Some components call `location.href` or submit forms. In tests, spy on the function that navigates (e.g., `_cancel`) and avoid real page changes. The test runner aborts if the page navigates.

### 4) `showPicker()` and user gestures

- `HTMLInputElement.showPicker()` requires a user gesture and may not exist in the test browser.
- In tests, set a fake function: `input.showPicker = () => {};` before invoking code that calls it, or verify the focus fallback path.

### 5) i18n change propagation

- Changing `<html lang>` triggers a `MutationObserver` in the i18n module which dispatches `i18n-changed`.
- In tests, after `document.documentElement.lang = 'tr'` also fire:

  ```js
  window.dispatchEvent(new CustomEvent('i18n-changed'));
  await aTimeout(0);
  ```

---

## Troubleshooting

**Playwright executable missing**

- Run `npx playwright install`.

**“ES Modules cannot be stubbed”**

- You tried to stub a live import. Use the static indirection pattern or instance-level spies.

**“Tests were interrupted because the page navigated…”**

- A test caused navigation (`location.href`, anchor click, or form submit). Spy/override the method that navigates.

**404 for `test/src/...`**

- Import components from `src/...`, not `test/src/...` inside tests.

**“showPicker() requires a user gesture”**

- Don’t call it directly; set `input.showPicker = () => {};` in tests or assert the focus fallback.

**Coverage below threshold**

- Open `coverage/index.html` and add tests for red lines/branches.

---

## Notes on i18n

- `src/i18n/i18n.js` loads `en.json` and `tr.json`, resolves the active dictionary by `<html lang>`, and emits `i18n-changed` on changes.
- Components read translations via `t(key, params)` and re-render on the `i18n-changed` event.

---

## Accessibility

- Confirm dialog traps focus, supports `Escape` / `Enter` / `Tab` logic, and restores focus to the previously focused element.
- Pagination uses `aria-current`, `aria-label`, and `rel="next"`.
- Lists, tables, and action buttons include labels for screen readers.

---

## License

BSD-3-Clause (same as the Lit starter). See headers in source files.

# LitElement JavaScript starter

This project includes a sample component using LitElement with JavaScript.

This template is generated from the `lit-starter-js` package in [the main Lit
repo](https://github.com/lit/lit). Issues and PRs for this template should be
filed in that repo.

## About this release

This is a pre-release of Lit 3.0, the next major version of Lit.

Lit 3.0 has very few breaking changes from Lit 2.0:

- Drops support for IE11
- Published as ES2021
- Removes a couple of deprecated Lit 1.x APIs

Lit 3.0 should require no changes to upgrade from Lit 2.0 for the vast majority of users. Once the full release is published, most apps and libraries will be able to extend their npm version ranges to include both 2.x and 3.x, like `"^2.7.0 || ^3.0.0"`.

Lit 2.x and 3.0 are _interoperable_: templates, base classes, directives, decorators, etc., from one version of Lit will work with those from another.

Please file any issues you find on our [issue tracker](https://github.com/lit/lit/issues).

## Setup

Install dependencies:

```bash
npm i
```

## Testing

This sample modern-web.dev's
[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) for testing. See the
[modern-web.dev testing documentation](https://modern-web.dev/docs/test-runner/overview) for
more information.

Tests can be run with the `test` script, which will run your tests against Lit's development mode (with more verbose errors) as well as against Lit's production mode:

```bash
npm test
```

For local testing during development, the `test:dev:watch` command will run your tests in Lit's development mode (with verbose errors) on every change to your source files:

```bash
npm test:watch
```

Alternatively the `test:prod` and `test:prod:watch` commands will run your tests in Lit's production mode.

## Dev Server

This sample uses modern-web.dev's [@web/dev-server](https://www.npmjs.com/package/@web/dev-server) for previewing the project without additional build steps. Web Dev Server handles resolving Node-style "bare" import specifiers, which aren't supported in browsers. It also automatically transpiles JavaScript and adds polyfills to support older browsers. See [modern-web.dev's Web Dev Server documentation](https://modern-web.dev/docs/dev-server/overview/) for more information.

To run the dev server and open the project in a new browser tab:

```bash
npm run serve
```

There is a development HTML file located at `/dev/index.html` that you can view at http://localhost:8000/dev/index.html. Note that this command will serve your code using Lit's development mode (with more verbose errors). To serve your code against Lit's production mode, use `npm run serve:prod`.

## Editing

If you use VS Code, we highly recommend the [lit-plugin extension](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin), which enables some extremely useful features for lit-html templates:

- Syntax highlighting
- Type-checking
- Code completion
- Hover-over docs
- Jump to definition
- Linting
- Quick Fixes

The project is setup to recommend lit-plugin to VS Code users if they don't already have it installed.

## Linting

Linting of JavaScript files is provided by [ESLint](eslint.org). In addition, [lit-analyzer](https://www.npmjs.com/package/lit-analyzer) is used to type-check and lint lit-html templates with the same engine and rules as lit-plugin.

The rules are mostly the recommended rules from each project, but some have been turned off to make LitElement usage easier. The recommended rules are pretty strict, so you may want to relax them by editing `.eslintrc.json`.

To lint the project run:

```bash
npm run lint
```

## Formatting

[Prettier](https://prettier.io/) is used for code formatting. It has been pre-configured according to the Lit's style. You can change this in `.prettierrc.json`.

Prettier has not been configured to run when committing files, but this can be added with Husky and `pretty-quick`. See the [prettier.io](https://prettier.io/) site for instructions.

## Static Site

This project includes a simple website generated with the [eleventy](https://11ty.dev) static site generator and the templates and pages in `/docs-src`. The site is generated to `/docs` and intended to be checked in so that GitHub pages can serve the site [from `/docs` on the main branch](https://help.github.com/en/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

To enable the site go to the GitHub settings and change the GitHub Pages &quot;Source&quot; setting to &quot;main branch /docs folder&quot;.</p>

To build the site, run:

```bash
npm run docs
```

To serve the site locally, run:

```bash
npm run docs:serve
```

To watch the site files, and re-build automatically, run:

```bash
npm run docs:gen:watch
```

The site will usually be served at http://localhost:8000.

**Note**: The project uses Rollup to bundle and minify the source code for the docs site and not to publish to NPM. For bundling and minification, check the [Bundling and minification](#bundling-and-minification) section.

## Bundling and minification

As stated in the [static site generation](#static-site) section, the bundling and minification setup in the Rollup configuration in this project is there specifically for the docs generation.

We recommend publishing components as unoptimized JavaScript modules and performing build-time optimizations at the application level. This gives build tools the best chance to deduplicate code, remove dead code, and so on.

Please check the [Publishing best practices](https://lit.dev/docs/tools/publishing/#publishing-best-practices) for information on publishing reusable Web Components, and [Build for production](https://lit.dev/docs/tools/production/) for building application projects that include LitElement components, on the Lit site.

## More information

See [Get started](https://lit.dev/docs/getting-started/) on the Lit site for more information.
