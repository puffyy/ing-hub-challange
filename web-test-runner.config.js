// web-test-runner.config.js
import {legacyPlugin} from '@web/dev-server-legacy';
import {playwrightLauncher} from '@web/test-runner-playwright';

const mode = process.env.MODE || 'dev';
if (!['dev', 'prod'].includes(mode)) {
  throw new Error(`MODE must be "dev" or "prod", was "${mode}"`);
}

const browsersAll = {
  chromium: playwrightLauncher({product: 'chromium'}),
  firefox: playwrightLauncher({product: 'firefox'}),
  webkit: playwrightLauncher({product: 'webkit'}),
};

// BROWSERS=chromium,firefox npm run test
let selectedBrowsers;
if (process.env.BROWSERS) {
  selectedBrowsers = process.env.BROWSERS.split(',').map((k) => {
    if (!browsersAll[k]) throw new Error(`Unknown browser '${k}'`);
    return browsersAll[k];
  });
}

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default {
  rootDir: '.',
  files: ['test/**/*_test.js', 'test/**/*.test.js'], // supports ._test.js and .test.js
  nodeResolve: {exportConditions: mode === 'dev' ? ['development'] : []},
  preserveSymlinks: true,
  browsers: selectedBrowsers ?? Object.values(browsersAll),

  testFramework: {
    config: {ui: 'tdd', timeout: 60000},
  },

  // ✅ V8 coverage config (no import needed)
  coverageConfig: {
    include: ['src/**/*.js'],
    exclude: ['**/*.css', 'src/styles/**', 'src/assets/**', 'src/i18n/*.json'],
    reportDir: 'coverage',
    report: ['text', 'html', 'lcov'],
    threshold: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },

  plugins: [
    legacyPlugin({
      polyfills: {
        webcomponents: true,
        custom: [
          {
            name: 'lit-polyfill-support',
            path: 'node_modules/lit/polyfill-support.js',
            test: "!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype) || (window.ShadyDOM && window.ShadyDOM.force)",
            module: false,
          },
        ],
      },
    }),
  ],
};
