// test/app-root.test.js
import {expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

// Import the class so we can override deps before defining the element
import '../src/app-root.js';
import {AppRoot} from '../src/app-root.js';

suite('<app-root>', () => {
  let origDeps;

  setup(() => {
    // Save originals and inject spies/stubs
    origDeps = {...AppRoot.deps};
    AppRoot.setDeps({
      initRouter: sinon.spy(),
      seedFromJSONIfEmpty: sinon.stub().resolves(),
    });
  });

  teardown(() => {
    // Restore originals to avoid cross-test leakage
    AppRoot.setDeps(origDeps);
  });

  test('renders header and outlet', async () => {
    const el = await fixture(html`<app-root></app-root>`);
    const header = el.renderRoot.querySelector('hr-header');
    const outlet = el.renderRoot.querySelector('#outlet');
    expect(header).to.exist;
    expect(outlet).to.exist;
  });

  test('calls initRouter with outlet and awaits seedFromJSONIfEmpty', async () => {
    const el = await fixture(html`<app-root></app-root>`);
    await el.updateComplete;

    const {initRouter, seedFromJSONIfEmpty} = AppRoot.deps;

    // initRouter is called once with the outlet element
    expect(initRouter.calledOnce).to.be.true;
    const outlet = el.renderRoot.querySelector('#outlet');
    expect(initRouter.firstCall.args[0]).to.equal(outlet);

    // seedFromJSONIfEmpty is awaited and called once
    expect(seedFromJSONIfEmpty.calledOnce).to.be.true;
  });
});
