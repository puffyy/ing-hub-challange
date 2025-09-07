// Initialize dictionaries and current language
let dicts = {};
let current = null;

async function load() {
  // Load language files
  const enUrl = new URL('./en.json', import.meta.url);
  const trUrl = new URL('./tr.json', import.meta.url);
  // eslint-disable-next-line no-undef
  const [en, tr] = await Promise.all([
    fetch(enUrl).then((r) => r.json()),
    fetch(trUrl).then((r) => r.json()),
  ]);
  dicts = {en, 'en-US': en, tr, 'tr-TR': tr};
  current = resolve(document.documentElement.lang);
}

function resolve(code) {
  // Resolve the appropriate dictionary for the given language code
  return dicts[code] || dicts[code?.split('-')[0]] || dicts.en;
}

export function t(key, vars = {}) {
  // Translate a key with optional variables
  const val = key.split('.').reduce((o, k) => o?.[k], current || {}) ?? key;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    val
  );
}

// Load dictionaries on initialization
await load();

// Observe changes to the 'lang' attribute and update the current dictionary
new MutationObserver(() => {
  current = resolve(document.documentElement.lang);
  window.dispatchEvent(new CustomEvent('i18n-changed'));
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['lang'],
});
