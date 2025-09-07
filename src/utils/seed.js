// src/utils/seed.js
// Importing the employees store
import {employeesStore} from '../store/employees.store.js';

// Resolves to the default seed URL for employee data
const DEFAULT_SEED_URL = new URL('./employees.seed.json', import.meta.url);

export async function seedFromJSONIfEmpty(seedUrl = DEFAULT_SEED_URL) {
  // Get the current state of the employees store
  const s = employeesStore.getState();
  // If the store already has data, exit the function
  if ((s.all()?.length || 0) > 0) return;

  // Fetch the seed data from the provided URL
  const res = await fetch(seedUrl, {cache: 'no-cache'});
  // If the fetch fails (e.g., 404), exit the function
  if (!res.ok) return;
  // Parse the JSON response
  const arr = await res.json();
  for (const e of arr) {
    // Insert each employee into the store, ensuring the email is trimmed and lowercase
    s.upsert({
      ...e,
      email: String(e.email || '')
        .trim()
        .toLowerCase(),
    });
  }
}
