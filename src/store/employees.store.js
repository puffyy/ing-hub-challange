// @ts-check
import {createJSONStorage, persist} from 'zustand/middleware';
import {createStore} from 'zustand/vanilla';
import {idbStorage} from './storage.idb.js';

/**
 * @typedef {'Analytics'|'Tech'} Department
 * @typedef {'Junior'|'Medior'|'Senior'} Position
 * @typedef {{id:string,firstName:string,lastName:string,employmentDate:string,birthDate:string,phone:string,email:string,department:Department,position:Position}} Employee
 * @typedef {{
 *   employees: Employee[];
 *   all: () => Employee[];
 *   byId: (id: string) => Employee | null;
 *   upsert: (e: Omit<Employee,'id'> & { id?: string }) => string;
 *   remove: (id: string) => void;
 *   clearAll: () => void;
 * }} EmpState
 */

// Generate a unique ID for employees
export let genId = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

// Allow overriding the ID generator (useful for testing)
export function __setIdGenerator(fn) {
  genId = typeof fn === 'function' ? fn : genId;
}

/**
 * Create the employee state with methods for managing employees.
 * @type {import('zustand/vanilla').StateCreator<EmpState, [], [["zustand/persist", unknown]]>}
 */
const createEmpState = (set, get) => ({
  employees: [], // List of employees

  all: () => get().employees, // Get all employees
  byId: (id) => get().employees.find((e) => e.id === id) ?? null, // Get employee by ID

  upsert: (e) => {
    // Add or update an employee
    const next = structuredClone(get().employees);
    const id = e.id ?? genId();

    // Normalize email
    const email = String(e.email || '')
      .trim()
      .toLowerCase();

    // Enforce unique email addresses
    const dupe = next.some(
      (x) => (x.email || '').toLowerCase() === email && x.id !== id
    );
    if (dupe) {
      const err = new Error('UNIQUE_EMAIL');
      // @ts-ignore - cause is not in Error type, but it's useful at runtime
      err.cause = {field: 'email'};
      throw err;
    }

    // Add new employee or update existing one
    const idx = next.findIndex((x) => x.id === id);
    const rec = {...e, id, email};
    if (idx === -1) next.push(rec);
    else next[idx] = rec;

    set({employees: next});
    return id;
  },

  remove: (id) => set({employees: get().employees.filter((e) => e.id !== id)}), // Remove an employee by ID
  clearAll: () => set({employees: []}), // Clear all employees
});

/**
 * Create the employees store with persistence.
 * @type {import('zustand/vanilla').StoreApi<EmpState>}
 */
export const employeesStore = createStore(
  persist(createEmpState, {
    name: 'hr/employees', // Storage key
    version: 1, // Version of the store
    storage: createJSONStorage(() => idbStorage), // Use IndexedDB for storage
    partialize: (s) => ({employees: s.employees}), // Persist only the employees list
  })
);
