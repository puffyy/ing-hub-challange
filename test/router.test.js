// test/router.test.js
import {expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';

let vaadin;
let initRouter;
let setRoutesSpy;

suite('router.initRouter()', () => {
  suiteSetup(async () => {
    // Import Router first, patch its prototype, then import initRouter
    vaadin = await import('@vaadin/router');
    setRoutesSpy = sinon.spy(vaadin.Router.prototype, 'setRoutes');
    ({initRouter} = await import('../src/router.js'));
  });

  teardown(() => {
    // Clean call history between tests
    setRoutesSpy.resetHistory();
  });

  suiteTeardown(() => {
    // Restore patched method
    setRoutesSpy.restore();
  });

  test('creates Router, registers routes once, returns the instance', async () => {
    const outlet = await fixture(html`<div id="outlet"></div>`);
    const router = initRouter(outlet);

    expect(router).to.be.instanceOf(vaadin.Router);
    expect(setRoutesSpy.calledOnce, 'setRoutes called once').to.be.true;

    const routes = setRoutesSpy.firstCall.args[0];
    expect(routes).to.be.an('array');

    // Root redirect
    expect(routes.some((r) => r.path === '/' && r.redirect === '/employees')).to
      .be.true;

    // /employees
    const listRoute = routes.find((r) => r.path === '/employees');
    expect(listRoute?.component).to.equal('page-employees');
    expect(listRoute?.action).to.be.a('function');

    // /employees/new
    const newRoute = routes.find((r) => r.path === '/employees/new');
    expect(newRoute?.component).to.equal('page-employee-edit');
    expect(newRoute?.action).to.be.a('function');

    // /employees/:id
    const editRoute = routes.find((r) => r.path === '/employees/:id');
    expect(editRoute?.component).to.equal('page-employee-edit');
    expect(editRoute?.action).to.be.a('function');

    // catch-all
    expect(routes.some((r) => r.path === '(.*)' && r.redirect === '/employees'))
      .to.be.true;
  });
});
