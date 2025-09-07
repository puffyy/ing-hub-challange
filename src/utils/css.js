// Loads external CSS into a component's shadowRoot.
// - Uses constructable stylesheets when supported (fast, no CSP inline needed).
// - Falls back to <style> with cached text (requires style-src 'unsafe-inline' in CSP).
// - Caches by URL to avoid re-fetching across components/instances.

const cache = new Map(); // href -> { sheet?: CSSStyleSheet, text?: string }

/**
 * Adopt one or more CSS files into a shadowRoot.
 * Usage in component:
 *   await adoptCss(this.shadowRoot, new URL('../styles/thing.css', import.meta.url).href);
 *   // or multiple:
 *   await adoptCss(this.shadowRoot, [
 *     new URL('../styles/tokens.css', import.meta.url).href,
 *     new URL('../styles/thing.css', import.meta.url).href
 *   ]);
 *
 * @param {ShadowRoot} root
 * @param {string|string[]} urls - absolute or root-relative hrefs (use new URL(..., import.meta.url).href)
 */
export async function adoptCss(root, urls) {
  if (!root) throw new Error('adoptCss: shadowRoot is required'); // Ensure shadowRoot is provided
  const hrefs = (Array.isArray(urls) ? urls : [urls]).filter(Boolean); // Normalize URLs into an array

  const constructableSupported =
    !!root.adoptedStyleSheets &&
    typeof CSSStyleSheet !== 'undefined' &&
    'replace' in CSSStyleSheet.prototype; // Check if constructable stylesheets are supported

  for (const href of hrefs) {
    if (constructableSupported) {
      const sheet = await getSheet(href); // Get or create a constructable stylesheet
      // avoid duplicates
      if (!root.adoptedStyleSheets.includes(sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]; // Add stylesheet to shadowRoot
      }
    } else {
      const text = await getText(href); // Fetch CSS text
      // avoid duplicating style tags for the same href
      if (!root.querySelector(`style[data-href="${cssEscapeAttr(href)}"]`)) {
        const style = document.createElement('style'); // Create a <style> element
        style.setAttribute('data-href', href); // Add data-href attribute for identification
        style.textContent = text; // Set CSS text
        root.appendChild(style); // Append to shadowRoot
      }
    }
  }
}

/** Clear the CSS cache (all or one href) — handy for HMR or tests. */
export function clearCssCache(href) {
  if (href) cache.delete(href); // Clear specific href from cache
  else cache.clear(); // Clear entire cache
}

async function getSheet(href) {
  const cached = cache.get(href); // Check cache for existing sheet
  if (cached?.sheet) return cached.sheet; // Return cached sheet if available

  const text = await getText(href); // Fetch CSS text
  const sheet = new CSSStyleSheet(); // Create a new constructable stylesheet
  await sheet.replace(text); // Populate the stylesheet with CSS text
  cache.set(href, {...(cached || {}), sheet, text}); // Cache the sheet and text
  return sheet;
}

async function getText(href) {
  const cached = cache.get(href); // Check cache for existing text
  if (cached?.text) return cached.text; // Return cached text if available

  const res = await fetch(href, {cache: 'no-cache'}); // Fetch CSS file
  if (!res.ok)
    throw new Error(`adoptCss: failed to load ${href} (${res.status})`); // Handle fetch errors
  const text = await res.text(); // Get response text
  cache.set(href, {...(cached || {}), text}); // Cache the text
  return text;
}

// Minimal attribute escaper for querySelector matching
function cssEscapeAttr(value) {
  return value.replace(/"/g, '\\"'); // Escape double quotes
}
