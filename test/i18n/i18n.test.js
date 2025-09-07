import {expect, oneEvent} from '@open-wc/testing';

// Helper: change <html lang> and wait for the module's event
async function setLangAndWait(lang) {
  const wait = oneEvent(window, 'i18n-changed'); // Wait for i18n-changed event
  document.documentElement.lang = lang; // Set the language
  await wait;
}

suite('i18n utilities', () => {
  let t; // Translation function
  let enDict; // English dictionary
  let trDict; // Turkish dictionary

  suiteSetup(async () => {
    // Start from English before importing the module so its initial load resolves to EN
    document.documentElement.lang = 'en';

    // Import the module under test
    ({t} = await import('../../src/i18n/i18n.js'));

    // Load dictionaries for exact-value assertions (no hardcoding)
    enDict = await (
      await fetch(new URL('../../src/i18n/en.json', import.meta.url))
    ).json();
    trDict = await (
      await fetch(new URL('../../src/i18n/tr.json', import.meta.url))
    ).json();
  });

  test('initial language is English & nested keys resolve', () => {
    // Assert initial language is English and keys resolve correctly
    expect(t('actions.save')).to.equal(enDict.actions.save);
    expect(t('actions.cancel')).to.equal(enDict.actions.cancel);
  });

  test('variable substitution works in English', () => {
    // Test variable substitution in English
    const template = enDict.errors?.required ?? '{label}: is required.';
    const expected = template.replaceAll('{label}', 'Email');
    expect(t('errors.required', {label: 'Email'})).to.equal(expected);
  });

  test('reacts to <html lang> changes and fires i18n-changed', async () => {
    // Test language change to Turkish
    await setLangAndWait('tr-TR');
    expect(t('actions.cancel')).to.equal(trDict.actions.cancel);
  });

  test('falls back to base language (tr-CY → tr)', async () => {
    // Test fallback to base language
    await setLangAndWait('tr-CY');
    expect(t('actions.save')).to.equal(trDict.actions.save);
  });

  test('falls back to English when language is unknown', async () => {
    // Test fallback to English for unknown language
    await setLangAndWait('de');
    expect(t('actions.save')).to.equal(enDict.actions.save);
  });

  test('falls back to English for region variants (en-GB → en)', async () => {
    // Test fallback to English for region variants
    await setLangAndWait('en-GB');
    expect(t('actions.save')).to.equal(enDict.actions.save);
  });

  test('returns the key itself when missing', () => {
    // Test behavior for missing keys
    const missing = 'this.key.does.not.exist';
    expect(t(missing)).to.equal(missing);
  });

  test('variable substitution works in Turkish after switching', async () => {
    // Test variable substitution in Turkish
    await setLangAndWait('tr');
    const template = trDict.errors?.required ?? '{label}: is required.';
    const expected = template.replaceAll('{label}', 'E-posta');
    expect(t('errors.required', {label: 'E-posta'})).to.equal(expected);
  });
});
