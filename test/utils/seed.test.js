// test/utils/seed.test.js
import {expect} from '@open-wc/testing';
import sinon from 'sinon';

import {employeesStore} from '../../src/store/employees.store.js';
import {seedFromJSONIfEmpty} from '../../src/utils/seed.js';

// Build the same default URL the module uses:
const DEFAULT_URL = new URL(
  '../../src/utils/employees.seed.json',
  import.meta.url
).toString();

suite('utils/seed - seedFromJSONIfEmpty', () => {
  teardown(() => sinon.restore()); // Restore all stubs after each test

  function makeStore({allReturns = [], upsertSpy} = {}) {
    // Mock the store with custom behavior for `all` and `upsert`
    const store = {
      all: sinon.stub().returns(allReturns),
      upsert: upsertSpy ?? sinon.spy(),
    };
    sinon.stub(employeesStore, 'getState').returns(store);
    return store;
  }

  function stubFetch(map) {
    // Stub fetch calls based on the provided map of URLs to responses
    // eslint-disable-next-line no-unused-vars
    return sinon.stub(window, 'fetch').callsFake(async (input, _init) => {
      const key = typeof input === 'string' ? input : input?.toString();
      const spec = map[key];
      if (!spec) throw new Error('Unexpected fetch: ' + key);
      return {
        ok: spec.ok !== false,
        status: spec.status ?? 200,
        async json() {
          return spec.json ?? [];
        },
      };
    });
  }

  test('returns immediately if store already has data (no fetch, no upsert)', async () => {
    makeStore({allReturns: [{id: '1'}]}); // Store already has data
    const fetchStub = sinon.stub(window, 'fetch');
    await seedFromJSONIfEmpty();
    // Assert no fetch or upsert calls
    expect(fetchStub.called).to.be.false;
    expect(employeesStore.getState().upsert.called).to.be.false;
  });

  test('proceeds if store is empty when all() -> [] (fetch is called)', async () => {
    makeStore({allReturns: []}); // Store is empty
    const fetchStub = stubFetch({[DEFAULT_URL]: {json: []}});
    await seedFromJSONIfEmpty();
    // Assert fetch is called
    expect(fetchStub.calledOnce).to.be.true;
    const [, init] = fetchStub.firstCall.args;
    expect(init?.cache).to.equal('no-cache');
  });

  test('also proceeds if all() -> undefined (treated as empty)', async () => {
    const store = makeStore({allReturns: undefined}); // Store returns undefined
    const fetchStub = stubFetch({[DEFAULT_URL]: {json: []}});
    await seedFromJSONIfEmpty();
    // Assert fetch is called and no upsert occurs
    expect(fetchStub.calledOnce).to.be.true;
    expect(store.upsert.called).to.be.false;
  });

  test('does nothing if fetch returns not ok (e.g., 404) — no upsert calls', async () => {
    const store = makeStore({allReturns: []});
    stubFetch({[DEFAULT_URL]: {ok: false, status: 404}});
    await seedFromJSONIfEmpty();
    // Assert no upsert occurs on fetch failure
    expect(store.upsert.called).to.be.false;
  });

  test('seeds multiple employees; normalizes email (trim+lowercase)', async () => {
    const store = makeStore({allReturns: []});
    stubFetch({
      [DEFAULT_URL]: {
        json: [
          {firstName: 'A', email: '  USER@EXAMPLE.COM  ', department: 'Tech'},
          {firstName: 'B', email: 'MiXeD@Dom.Com', department: 'Analytics'},
        ],
      },
    });
    await seedFromJSONIfEmpty();
    // Assert two employees are seeded with normalized emails
    expect(store.upsert.callCount).to.equal(2);
    expect(store.upsert.firstCall.args[0]).to.include({
      firstName: 'A',
      email: 'user@example.com',
      department: 'Tech',
    });
    expect(store.upsert.secondCall.args[0]).to.include({
      firstName: 'B',
      email: 'mixed@dom.com',
      department: 'Analytics',
    });
  });

  test('seeds with empty string when email is missing/null/undefined', async () => {
    const store = makeStore({allReturns: []});
    stubFetch({
      [DEFAULT_URL]: {
        json: [
          {firstName: 'NoEmail1'},
          {firstName: 'NoEmail2', email: null},
          {firstName: 'NoEmail3', email: undefined},
        ],
      },
    });
    await seedFromJSONIfEmpty();
    // Assert employees are seeded with empty email strings
    expect(store.upsert.callCount).to.equal(3);
    for (let i = 0; i < 3; i++) {
      const arg = store.upsert.getCall(i).args[0];
      expect(arg.firstName).to.match(/NoEmail[1-3]/);
      expect(arg.email).to.equal('');
    }
  });

  test('uses provided custom URL (string) and passes cache:no-cache', async () => {
    const store = makeStore({allReturns: []});
    const CUSTOM_URL_STR = 'https://example.com/seed.json';
    const fetchStub = stubFetch({[CUSTOM_URL_STR]: {json: []}});
    await seedFromJSONIfEmpty(CUSTOM_URL_STR);
    // Assert fetch is called with custom URL
    expect(fetchStub.calledOnce).to.be.true;
    expect(fetchStub.firstCall.args[0]).to.equal(CUSTOM_URL_STR);
    const [, init] = fetchStub.firstCall.args;
    expect(init?.cache).to.equal('no-cache');
    expect(store.upsert.called).to.be.false;
  });

  test('uses provided custom URL (URL object) and seeds correctly', async () => {
    const store = makeStore({allReturns: []});
    const CUSTOM_URL_OBJ = new URL('https://example.com/seed-obj.json');
    const fetchStub = stubFetch({
      [CUSTOM_URL_OBJ.toString()]: {json: [{firstName: 'C', email: 'C@X.com'}]},
    });
    await seedFromJSONIfEmpty(CUSTOM_URL_OBJ);
    // Assert fetch is called with custom URL object and employee is seeded
    expect(fetchStub.calledOnce).to.be.true;
    expect(fetchStub.firstCall.args[0].toString()).to.equal(
      CUSTOM_URL_OBJ.toString()
    );
    expect(store.upsert.calledOnce).to.be.true;
    expect(store.upsert.firstCall.args[0]).to.include({
      firstName: 'C',
      email: 'c@x.com',
    });
  });
});
