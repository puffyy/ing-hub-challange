// test/store/employees.store.test.js
import {expect} from '@open-wc/testing';
import sinon from 'sinon';

// IMPORTANT: always import the module *after* any globals you want to stub
import {
  __setIdGenerator,
  employeesStore,
} from '../../src/store/employees.store.js';

// Small helper: let the persist middleware flush async work (IDB writes, etc.)
const tick = () => new Promise((r) => setTimeout(r, 0));

async function resetStore() {
  // Clear state in memory
  employeesStore.setState({employees: []});
  // Clear persisted storage if present (zustand/persist API)
  if (employeesStore.persist?.clearStorage) {
    await employeesStore.persist.clearStorage();
  }
  await tick(); // Wait for async operations to complete
}

suite('employees.store', () => {
  setup(async () => {
    await resetStore(); // Reset store before each test
  });

  teardown(async () => {
    sinon.restore(); // Restore all stubs and spies
    await resetStore(); // Reset store after each test
  });

  test('initial state: all() returns empty array and byId() returns null', () => {
    const s = employeesStore.getState();
    // Assert initial state is empty
    expect(s.all()).to.deep.equal([]);
    expect(s.byId('does-not-exist')).to.equal(null);
  });

  test('upsert() inserts a new employee, generates id (crypto path), normalizes email, and byId() finds it', async () => {
    const s = employeesStore.getState();
    const retId = s.upsert({
      // id omitted on purpose -> uuid is generated
      firstName: 'Ada',
      lastName: 'Lovelace',
      employmentDate: '2020-01-15',
      birthDate: '1990-10-10',
      phone: '+90 555 555 55 55',
      email: '  ADA@EXAMPLE.COM  ', // should be trimmed + lowercased
      department: 'Tech',
      position: 'Senior',
    });
    // Assert id is generated and email is normalized
    expect(retId).to.be.a('string').and.not.empty;

    const all = s.all();
    expect(all).to.have.length(1);
    expect(all[0].id).to.equal(retId);
    expect(all[0].email).to.equal('ada@example.com');

    // byId returns the same record
    expect(s.byId(retId)).to.deep.equal(all[0]);
  });

  test('upsert() updates existing by id (replace path), does not change array length', () => {
    const s = employeesStore.getState();

    const id = s.upsert({
      firstName: 'Grace',
      lastName: 'Hopper',
      employmentDate: '2018-05-01',
      birthDate: '1985-12-09',
      phone: '+1 (555) 111-2222',
      email: 'grace@example.com',
      department: 'Tech',
      position: 'Senior',
    });

    const beforeLen = s.all().length;
    const retId = s.upsert({
      id, // update same record
      firstName: 'Grace',
      lastName: 'Updated',
      employmentDate: '2018-05-01',
      birthDate: '1985-12-09',
      phone: '+1 (555) 111-2222',
      email: 'grace@example.com', // same email
      department: 'Tech',
      position: 'Senior',
    });

    // Assert id remains the same and array length is unchanged
    expect(retId).to.equal(id);
    const after = s.all();
    expect(after).to.have.length(beforeLen);
    expect(after.find((e) => e.id === id).lastName).to.equal('Updated');
  });

  test('upsert() enforces unique email (case-insensitive) across different ids', () => {
    const s = employeesStore.getState();

    const id1 = s.upsert({
      firstName: 'Linus',
      lastName: 'Torvalds',
      employmentDate: '2010-02-02',
      birthDate: '1970-12-28',
      phone: '+358 555 123',
      email: 'linus@example.com',
      department: 'Tech',
      position: 'Senior',
    });
    expect(id1).to.be.a('string');

    // Try to insert a NEW record with same email different case
    const call = () =>
      s.upsert({
        firstName: 'Someone',
        lastName: 'Else',
        employmentDate: '2011-03-03',
        birthDate: '1980-06-06',
        phone: '+1 222 333 4444',
        email: 'LINUS@EXAMPLE.COM',
        department: 'Tech',
        position: 'Junior',
      });

    try {
      call();
      throw new Error('Expected upsert to throw UNIQUE_EMAIL');
    } catch (err) {
      // Assert error is thrown for duplicate email
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('UNIQUE_EMAIL');
      expect(err.cause).to.deep.equal({field: 'email'});
    }
  });

  test('remove() deletes by id', () => {
    const s = employeesStore.getState();

    const id = s.upsert({
      firstName: 'Tim',
      lastName: 'Berners-Lee',
      employmentDate: '2000-01-01',
      birthDate: '1955-06-08',
      phone: '+44 555 0000',
      email: 'tim@example.org',
      department: 'Tech',
      position: 'Senior',
    });

    // Assert record exists before removal
    expect(s.all().some((e) => e.id === id)).to.be.true;
    s.remove(id);
    // Assert record is removed
    expect(s.all().some((e) => e.id === id)).to.be.false;
    expect(s.byId(id)).to.equal(null);
  });

  test('clearAll() empties the store', () => {
    const s = employeesStore.getState();
    s.upsert({
      firstName: 'A',
      lastName: 'A',
      employmentDate: '2022-01-01',
      birthDate: '2000-01-01',
      phone: '+1 000',
      email: 'a@x.com',
      department: 'Tech',
      position: 'Junior',
    });
    s.upsert({
      firstName: 'B',
      lastName: 'B',
      employmentDate: '2022-01-02',
      birthDate: '2000-01-02',
      phone: '+1 111',
      email: 'b@x.com',
      department: 'Analytics',
      position: 'Medior',
    });
    // Assert store has records before clearing
    expect(s.all()).to.have.length(2);

    s.clearAll();
    // Assert store is empty after clearing
    expect(s.all()).to.have.length(0);
  });

  test('uuid path uses injected generator when provided (safe fallback test)', () => {
    const s = employeesStore.getState();

    // Force deterministic id without touching window.crypto
    __setIdGenerator(() => 'test-id-123');
    try {
      const id = s.upsert({
        firstName: 'No',
        lastName: 'Crypto',
        employmentDate: '2021-04-04',
        birthDate: '1999-09-09',
        phone: '+1 222 222 2222',
        email: 'nocrypto@example.com',
        department: 'Analytics',
        position: 'Junior',
      });
      // Assert id matches injected generator
      expect(id).to.equal('test-id-123');
      expect(s.byId('test-id-123')).to.be.ok;
    } finally {
      __setIdGenerator(undefined); // Restore default generator
    }
  });

  test('byId() returns null for unknown id (explicit)', () => {
    const s = employeesStore.getState();
    // Assert byId returns null for unknown id
    expect(s.byId('not-here')).to.equal(null);
  });
});
