import {expect} from '@open-wc/testing';
import sinon from 'sinon';

import {adoptCss, clearCssCache} from '../../src/utils/css.js';

/** Helpers */
function stubFetch(map) {
  // Stub fetch calls based on the provided map of URLs to responses
  return sinon.stub(window, 'fetch').callsFake(async (href) => {
    const spec = map[href];
    if (!spec) throw new Error('unexpected fetch: ' + href);
    return {
      ok: spec.ok !== false,
      status: spec.status ?? 200,
      async text() {
        return spec.text ?? '';
      },
    };
  });
}

suite('utils/css - adoptCss & cache', () => {
  const URL_A = 'https://example.com/a.css';
  const URL_B = 'https://example.com/b.css';
  const URL_Q = 'https://example.com/q"uote.css'; // URL with a quote for testing

  teardown(() => {
    sinon.restore(); // Restore all stubs and spies
    clearCssCache(); // Clear CSS cache between tests
  });

  suite('constructable stylesheet path', () => {
    test('adopts one or multiple URLs; no duplicates; caching works', async () => {
      // Fake "shadowRoot-like" target with adoptedStyleSheets
      const root = {adoptedStyleSheets: []};

      const fetchStub = stubFetch({
        [URL_A]: {text: '/* A */'},
        [URL_B]: {text: '/* B */'},
      });

      // First call (single URL)
      await adoptCss(root, URL_A);
      expect(root.adoptedStyleSheets).to.have.length(1);

      // Duplicate call should not add or re-fetch
      await adoptCss(root, URL_A);
      expect(root.adoptedStyleSheets).to.have.length(1);
      expect(fetchStub.callCount).to.equal(1);

      // Add a second sheet
      await adoptCss(root, URL_B);
      expect(root.adoptedStyleSheets).to.have.length(2);
      expect(fetchStub.callCount).to.equal(2);

      // Multiple at once, both already present → no change, no fetch
      await adoptCss(root, [URL_A, URL_B]);
      expect(root.adoptedStyleSheets).to.have.length(2);
      expect(fetchStub.callCount).to.equal(2);

      // Clear cache for one URL → adopting again creates a new sheet instance
      clearCssCache(URL_A);
      await adoptCss(root, URL_A);
      expect(root.adoptedStyleSheets).to.have.length(3);
      expect(fetchStub.callCount).to.equal(3);

      // Clear all → adopt into a fresh root; both are fetched again
      clearCssCache();
      const another = {adoptedStyleSheets: []};
      await adoptCss(another, [URL_A, URL_B]);
      expect(another.adoptedStyleSheets).to.have.length(2);
      expect(fetchStub.callCount).to.equal(5);
    });

    test('throws on fetch error (not ok)', async () => {
      const root = {adoptedStyleSheets: []};
      stubFetch({[URL_A]: {ok: false, status: 404}});
      let err;
      try {
        await adoptCss(root, URL_A);
      } catch (e) {
        err = e;
      }
      // Assert error message contains fetch failure details
      expect(String(err)).to.match(/failed to load .*404/);
      expect(root.adoptedStyleSheets).to.have.length(0);
    });
  });

  suite('fallback <style> path', () => {
    test('injects <style> with data-href; no duplicates; caching works', async () => {
      // Use a regular element (no adoptedStyleSheets) to force fallback path
      const host = document.createElement('div');
      document.body.appendChild(host);

      const fetchStub = stubFetch({
        [URL_A]: {text: 'body{background:#000;}'},
        [URL_Q]: {text: '/* quote url */'},
      });

      // Single URL
      await adoptCss(host, URL_A);
      let styles = host.querySelectorAll('style[data-href]');
      expect(styles).to.have.length(1);
      expect(styles[0].getAttribute('data-href')).to.equal(URL_A);
      expect(styles[0].textContent).to.contain('background');

      // Duplicate — should not append a new <style>
      await adoptCss(host, URL_A);
      styles = host.querySelectorAll('style[data-href]');
      expect(styles).to.have.length(1);
      expect(fetchStub.callCount).to.equal(1);

      // URL containing a double quote: find by attribute equality
      await adoptCss(host, URL_Q);
      styles = host.querySelectorAll('style[data-href]');
      expect(styles).to.have.length(2);
      const qStyle = Array.from(styles).find(
        (s) => s.getAttribute('data-href') === URL_Q
      );
      expect(qStyle).to.exist;
      expect(fetchStub.callCount).to.equal(2);

      // Clear one and re-adopt → fetch again but still dedup DOM node
      clearCssCache(URL_A);
      await adoptCss(host, URL_A);
      styles = host.querySelectorAll('style[data-href]');
      expect(styles).to.have.length(2); // still 2 (no duplicates in DOM)
      expect(fetchStub.callCount).to.equal(3);

      host.remove(); // Clean up host element
    });

    test('throws on fetch error (not ok)', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      stubFetch({[URL_B]: {ok: false, status: 500}});
      let err;
      try {
        await adoptCss(host, URL_B);
      } catch (e) {
        err = e;
      }
      // Assert error message contains fetch failure details
      expect(String(err)).to.match(/failed to load .*500/);
      expect(host.querySelectorAll('style[data-href]')).to.have.length(0);
      host.remove(); // Clean up host element
    });
  });

  suite('input validation', () => {
    test('throws if root is missing', async () => {
      let err;
      try {
        // @ts-ignore - intentionally wrong
        await adoptCss(null, URL_A);
      } catch (e) {
        err = e;
      }
      // Assert error message for missing root
      expect(String(err)).to.contain('shadowRoot is required');
    });

    test('ignores falsy entries in the urls list', async () => {
      const root = {adoptedStyleSheets: []};
      const fetchStub = stubFetch({[URL_A]: {text: '/* A */'}});
      // @ts-ignore mix in some falsy values
      await adoptCss(root, [undefined, '', URL_A, null]);
      // Assert only valid URLs are processed
      expect(root.adoptedStyleSheets).to.have.length(1);
      expect(fetchStub.callCount).to.equal(1);
    });
  });
});
