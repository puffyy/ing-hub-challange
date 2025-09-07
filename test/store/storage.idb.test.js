// test/store/storage.idb.test.js
import {expect} from '@open-wc/testing';
import {idbStorage} from '../../src/store/storage.idb.js';

// Small helper to create unique keys per test
const k = (name) => `test:${name}:${Math.random().toString(36).slice(2)}`;

// Some runtimes benefit from a microtask between IDB ops
const tick = () => new Promise((r) => setTimeout(r, 0));

suite('idbStorage (IndexedDB adapter)', () => {
  teardown(async () => {
    // Clean up any keys we might have left under test:*
    // Each test uses unique keys and overwrites/removes its own data.
    await tick();
  });

  test('getItem returns undefined for an unknown key', async () => {
    const key = k('missing');
    const val = await idbStorage.getItem(key);
    // Assert undefined is returned for missing key
    expect(val).to.equal(undefined);
  });

  test('setItem/getItem roundtrip with a string value', async () => {
    const key = k('string');
    const value = 'hello-world';
    await idbStorage.setItem(key, value); // Store string value
    const got = await idbStorage.getItem(key);
    // Assert stored value matches retrieved value
    expect(got).to.equal(value);
  });

  test('setItem overwrites existing value', async () => {
    const key = k('overwrite');
    await idbStorage.setItem(key, 'first'); // Set initial value
    expect(await idbStorage.getItem(key)).to.equal('first');

    await idbStorage.setItem(key, 'second'); // Overwrite value
    expect(await idbStorage.getItem(key)).to.equal('second');
  });

  test('removeItem deletes the value', async () => {
    const key = k('remove');
    await idbStorage.setItem(key, 'to-be-removed'); // Set value
    expect(await idbStorage.getItem(key)).to.equal('to-be-removed');

    await idbStorage.removeItem(key); // Remove value
    // Assert value is deleted
    expect(await idbStorage.getItem(key)).to.equal(undefined);
  });

  test('roundtrip with an object (ensure non-string values are handled)', async () => {
    const key = k('object');
    const obj = {a: 1, b: {c: true}, d: ['x', 'y']};
    await idbStorage.setItem(key, obj); // Store object
    const got = await idbStorage.getItem(key);
    // Assert stored object matches retrieved object
    expect(got).to.deep.equal(obj);
  });

  test('concurrent writes and reads across many keys', async () => {
    const pairs = Array.from({length: 20}, (_, i) => ({
      key: k(`bulk-${i}`),
      val: {i, stamp: Date.now(), text: `#${i}`},
    }));

    // Write all in parallel
    await Promise.all(pairs.map(({key, val}) => idbStorage.setItem(key, val)));

    // Read all in parallel and verify
    const results = await Promise.all(
      pairs.map(({key}) => idbStorage.getItem(key))
    );

    // Assert all values match their respective keys
    results.forEach((got, i) => {
      expect(got).to.deep.equal(pairs[i].val);
    });
  });

  test('repeated get/set on same key remains stable (implicit db caching)', async () => {
    const key = k('stable');
    for (let i = 0; i < 5; i++) {
      await idbStorage.setItem(key, `v${i}`); // Update value
      // Assert value matches the latest set value
      expect(await idbStorage.getItem(key)).to.equal(`v${i}`);
    }
    await idbStorage.removeItem(key); // Remove key
    // Assert key is deleted
    expect(await idbStorage.getItem(key)).to.equal(undefined);
  });
});
