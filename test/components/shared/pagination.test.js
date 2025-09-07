// test/components/shared/pagination.test.js
import {aTimeout, expect, fixture, html, oneEvent} from '@open-wc/testing';
import sinon from 'sinon';

/** Stub fetch BEFORE importing the component so adoptCss() doesn't hit the network. */
function stubFetchCss() {
  const okText = (text) => ({
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => {
      try {
        return JSON.parse(text);
      } catch {
        return {};
      }
    },
  });
  return sinon.stub(window, 'fetch').callsFake(async (input) => {
    const url = String(input);
    if (url.endsWith('.css')) return okText('/* pagination css */');
    return okText('{}');
  });
}

/** Helpers */
const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];
const btnByText = (el, txt) =>
  $$(el, 'button').find((b) => b.textContent.trim() === String(txt));

suite('<x-pagination>', () => {
  // eslint-disable-next-line no-unused-vars
  let fetchStub;

  setup(async () => {
    fetchStub = stubFetchCss();
    // IMPORTANT: resolve from this test file (…/test/components/shared/) up to project root, then src/components/shared/.
    const modUrl = new URL(
      '../../../src/components/shared/pagination.js',
      import.meta.url
    ).href;
    await import(modUrl);
  });

  teardown(() => {
    sinon.restore();
  });

  test('renders and emits "page-change" when clicking a non-current page', async () => {
    const el = await fixture(html`
      <x-pagination .page=${1} .total=${100} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    // Buttons 1..7 (window), ellipsis, 10 + prev/next
    const b2 = btnByText(el, 2);
    expect(b2).to.exist;

    const nextEv = oneEvent(el, 'page-change');
    b2.click();
    const ev = await nextEv;

    expect(ev.detail.page).to.equal(2);
    expect(ev.bubbles).to.be.true;
    expect(ev.composed).to.be.true;
  });

  test('does NOT emit when clicking the current page', async () => {
    const el = await fixture(html`
      <x-pagination .page=${2} .total=${100} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    const current = btnByText(el, 2);
    expect(current).to.exist;
    let fired = false;
    el.addEventListener('page-change', () => (fired = true));

    current.click();
    await aTimeout(50);
    expect(fired).to.be.false; // _emit bails when next === this.page
  });

  test('prev/next disabled at edges and enabled otherwise', async () => {
    const el = await fixture(html`
      <x-pagination .page=${1} .total=${30} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    const prev = $(el, 'button.prev');
    const next = $(el, 'button.next');
    expect(prev.disabled).to.be.true;
    expect(next.disabled).to.be.false;
    expect(next.getAttribute('aria-disabled')).to.equal('false');

    // Move to last page (simulate parent handling)
    el.page = 3;
    await el.updateComplete;

    expect($(el, 'button.next').disabled).to.be.true;
    expect($(el, 'button.next').getAttribute('aria-disabled')).to.equal('true');
    expect($(el, 'button.prev').disabled).to.be.false;
  });

  test('clicking prev/next emits correct page values (and parent updates page)', async () => {
    const el = await fixture(html`
      <x-pagination .page=${5} .total=${100} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    // Click prev → expect 4
    let evP = oneEvent(el, 'page-change');
    $(el, 'button.prev').click();
    let ev = await evP;
    expect(ev.detail.page).to.equal(4);

    // Simulate parent updating .page
    el.page = ev.detail.page;
    await el.updateComplete;

    // Click next → expect 5 again
    let evN = oneEvent(el, 'page-change');
    $(el, 'button.next').click();
    ev = await evN;
    expect(ev.detail.page).to.equal(5);
  });

  test('hides completely when single page and "hideOnSinglePage" is true', async () => {
    const el = await fixture(html`
      <x-pagination
        .page=${1}
        .total=${5}
        .pageSize=${10}
        .hideOnSinglePage=${true}
      ></x-pagination>
    `);
    await el.updateComplete;

    // render() returns null -> no nav element
    expect($(el, 'nav.pagination')).to.not.exist;
  });

  test('shows single page UI when hideOnSinglePage is false (default)', async () => {
    const el = await fixture(html`
      <x-pagination .page=${1} .total=${5} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    expect($(el, 'nav.pagination')).to.exist;
    const prev = $(el, 'button.prev');
    const next = $(el, 'button.next');
    expect(prev.disabled).to.be.true;
    expect(next.disabled).to.be.true;

    const current = $$(el, 'button').find((b) =>
      b.classList.contains('current')
    );
    expect(current).to.exist;
    expect(current.textContent.trim()).to.equal('1');
    expect(current.getAttribute('aria-current')).to.equal('page');
  });

  test('respects maxButtons window and shows ellipses appropriately', async () => {
    // 20 pages total, current=8, span=5 => [1] … [6,7,8,9,10] … [20]
    const el = await fixture(html`
      <x-pagination
        .page=${8}
        .total=${200}
        .pageSize=${10}
        .maxButtons=${5}
      ></x-pagination>
    `);
    await el.updateComplete;

    const numberButtons = $$(el, 'button')
      .filter(
        (b) => !b.classList.contains('prev') && !b.classList.contains('next')
      )
      .map((b) => b.textContent.trim());
    // Includes first and last
    expect(numberButtons).to.deep.equal(['1', '6', '7', '8', '9', '10', '20']);

    const ellipses = $$(el, '.ellipsis');
    expect(ellipses.length).to.equal(2);

    const current = $$(el, 'button').find((b) =>
      b.classList.contains('current')
    );
    expect(current.textContent.trim()).to.equal('8');
    expect(current.getAttribute('aria-current')).to.equal('page');
  });

  test('clamps out-of-range "page" to bounds', async () => {
    // page is huge -> should clamp to last page (10)
    const el = await fixture(html`
      <x-pagination .page=${999} .total=${100} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    const current = $$(el, 'button').find((b) =>
      b.classList.contains('current')
    );
    expect(current.textContent.trim()).to.equal('10');
    expect($(el, 'button.next').disabled).to.be.true;

    // page=0 -> clamp to 1
    el.page = 0;
    await el.updateComplete;
    const current2 = $$(el, 'button').find((b) =>
      b.classList.contains('current')
    );
    expect(current2.textContent.trim()).to.equal('1');
    expect($(el, 'button.prev').disabled).to.be.true;
  });

  test('updates page window when pageSize changes', async () => {
    // total=33 → pages: 4 with size 10; then set pageSize=20 → pages: 2
    const el = await fixture(html`
      <x-pagination .page=${1} .total=${33} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    // Last button initially "4"
    let lastBtn = $$(el, 'button')
      .filter(
        (b) => !b.classList.contains('prev') && !b.classList.contains('next')
      )
      .pop();
    expect(lastBtn.textContent.trim()).to.equal('4');

    // Change size
    el.pageSize = 20;
    await el.updateComplete;

    lastBtn = $$(el, 'button')
      .filter(
        (b) => !b.classList.contains('prev') && !b.classList.contains('next')
      )
      .pop();
    expect(lastBtn.textContent.trim()).to.equal('2');
  });

  test('has correct ARIA attributes on navigation and control buttons', async () => {
    const el = await fixture(html`
      <x-pagination .page=${3} .total=${50} .pageSize=${10}></x-pagination>
    `);
    await el.updateComplete;

    const nav = $(el, 'nav.pagination');
    expect(nav).to.exist;
    expect(nav.getAttribute('role')).to.equal('navigation');
    expect(nav.getAttribute('aria-label')).to.equal('Pagination');

    const prev = $(el, 'button.prev');
    const next = $(el, 'button.next');
    expect(prev.getAttribute('aria-label')).to.equal('Previous page');
    expect(next.getAttribute('aria-label')).to.equal('Next page');
    expect(next.getAttribute('rel')).to.equal('next');

    // aria-current only on current
    const current = $$(el, 'button').find((b) =>
      b.classList.contains('current')
    );
    expect(current.getAttribute('aria-current')).to.equal('page');
    const others = $$(el, 'button').filter(
      (b) =>
        !b.classList.contains('current') &&
        !b.classList.contains('prev') &&
        !b.classList.contains('next')
    );
    for (const b of others) {
      expect(b.hasAttribute('aria-current')).to.be.false;
    }
  });
});
