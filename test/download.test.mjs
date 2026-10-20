import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, loadModules, tick } from './helpers/dom.mjs';
import { documentFixture, blurredUrl, ASSETS } from './fixtures/documents.mjs';

function setup(fixtureOpts, windowOpts) {
    const ctx = createWindow(documentFixture(fixtureOpts), windowOpts);
    const SH = loadModules(ctx.window);
    return { ...ctx, SH };
}

test('assembleContainer keeps only the p2hv class and upgrades free pages to the full bg image', () => {
    const { SH, document } = setup({
        shape: 'text-with-gaps', pageCount: 3, freePages: [1, 2],
        states: { 1: 'text', 2: 'blurred', 3: 'blurred' },
    });
    const clones = Array.from(document.querySelectorAll('#viewer-wrapper .pf')).map((pf) => pf.cloneNode(true));
    // Our own button inside a page clone must not end up in the PDF.
    const btn = document.createElement('button');
    btn.className = 'download-button-1';
    clones[0].appendChild(btn);

    const a = SH.getDocumentAccessData();
    const assets = {
        bgUrl: (n) => SH.bgImageUrl(a, n),
        blurUrl: (n) => SH.blurredPageUrl(a, n),
        isGated: (n) => SH.isTextGated(a, n),
    };
    const container = SH.download.assembleContainer(clones, assets);

    assert.equal(container.className, 'p2hv');
    assert.equal(container.querySelectorAll('.pf').length, 3);
    assert.equal(container.querySelector('.download-button-1'), null);

    const [p1, p2, p3] = container.querySelectorAll('.pf');
    assert.equal(p1.querySelector('img').getAttribute('src'), ASSETS + 'bg1.png?png=1');
    // A blurred raster on a free page is de-blurred rather than replaced.
    assert.equal(p2.querySelector('img').getAttribute('src'), ASSETS + 'pages/page2.webp?blur=1');
    assert.equal(p2.querySelector('[data-ds-gated-note]'), null);
    // The gated page keeps the blurred preview and gets the label.
    assert.equal(p3.querySelector('img').getAttribute('src'), blurredUrl(3));
    assert.ok(p3.querySelector('[data-ds-gated-note]'));
    assert.match(p3.querySelector('[data-ds-gated-note]').textContent, /Trang 3 bị khoá bản cao cấp/);
});

test('assembleContainer adds an image to a page that has none and forces hidden content visible', () => {
    const { SH, document } = setup({ shape: 'all-free', pageCount: 1, states: { 1: 'empty' } });
    const clone = document.querySelector('#viewer-wrapper .pf').cloneNode(true);
    const hidden = document.createElement('div');
    hidden.className = 'page-content';
    hidden.setAttribute('style', 'display: none; color: red');
    clone.appendChild(hidden);
    const a = SH.getDocumentAccessData();
    const container = SH.download.assembleContainer([clone], {
        bgUrl: (n) => SH.bgImageUrl(a, n), blurUrl: () => '', isGated: () => false,
    });
    const pf = container.querySelector('.pf');
    assert.equal(pf.querySelector('img').getAttribute('src'), ASSETS + 'bg1.png?png=1');
    const pc = pf.querySelector('.page-content');
    assert.equal(pc.style.getPropertyValue('display'), 'block');
    assert.equal(pc.style.getPropertyPriority('display'), 'important');
});

test('applyPageSizes emits one named @page rule per distinct page size and tags the pages', () => {
    const { SH, document } = setup({ shape: 'all-free', pageCount: 3, states: { 1: 'text', 2: 'text', 3: 'text' } });
    const container = document.createElement('div');
    const sizes = [[892, 1262], [892, 1262], [1262, 892]];
    sizes.forEach(([w, h]) => {
        const pf = document.createElement('div');
        pf.className = 'pf';
        pf.getBoundingClientRect = () => ({ width: w, height: h });
        container.appendChild(pf);
    });
    const css = SH.download.applyPageSizes(container);
    assert.equal(css, '@page{size:892px 1262px;margin:0;}@page ds-page-1{size:892px 1262px;margin:0;}@page ds-page-2{size:1262px 892px;margin:0;}');
    const pfs = container.querySelectorAll('.pf');
    assert.equal(pfs[0].style.getPropertyValue('page'), 'ds-page-1');
    assert.equal(pfs[1].style.getPropertyValue('page'), 'ds-page-1');
    assert.equal(pfs[2].style.getPropertyValue('page'), 'ds-page-2', 'landscape page gets its own sheet size');
    assert.equal(document.getElementById('ds-dl-page-size').textContent, css);
    // Pages without layout (jsdom default) are skipped and nothing breaks.
    const empty = document.createElement('div');
    empty.innerHTML = '<div class="pf"></div>';
    assert.equal(SH.download.applyPageSizes(empty), '');
});

test('applyPageSizes uses the pdf2htmlEX print layout and restores @media print', () => {
    const { SH, document } = setup({ shape: 'all-free', pageCount: 2, states: { 1: 'text', 2: 'text' } });
    const style = document.createElement('style');
    style.textContent = '@media print { .pf { width: 816pt; height: 1056pt; } }';
    document.head.appendChild(style);
    const rule = style.sheet.cssRules[0];
    const container = document.createElement('div');
    for (let i = 0; i < 2; i++) {
        const pf = document.createElement('div');
        pf.className = 'pf';
        pf.getBoundingClientRect = () => (rule.media.mediaText === 'all'
            ? { width: 1088, height: 1408 }
            : { width: 1024, height: 1325.176471 });
        container.appendChild(pf);
    }
    const css = SH.download.applyPageSizes(container);
    assert.equal(css, '@page{size:1088px 1408px;margin:0;}@page ds-page-1{size:1088px 1408px;margin:0;}');
    assert.equal(rule.media.mediaText, 'print', 'the print media query is restored after measuring');
});

test('applyPageSizes rounds a fractional page height up to avoid an extra blank sheet', () => {
    const { SH, document } = setup({ shape: 'all-free', pageCount: 1, states: { 1: 'text' } });
    const container = document.createElement('div');
    const pf = document.createElement('div');
    pf.className = 'pf';
    pf.getBoundingClientRect = () => ({ width: 1024, height: 1325.171875 });
    container.appendChild(pf);
    const css = SH.download.applyPageSizes(container);
    assert.equal(css, '@page{size:1024px 1326px;margin:0;}@page ds-page-1{size:1024px 1326px;margin:0;}');
    assert.equal(pf.style.getPropertyValue('page'), 'ds-page-1');
});

test('applyPageSizes falls back to the screen layout when the print layout has no size', () => {
    const { SH, document } = setup({ shape: 'all-free', pageCount: 1, states: { 1: 'text' } });
    const style = document.createElement('style');
    style.textContent = '@media print { .pf { display: none; } }';
    document.head.appendChild(style);
    const rule = style.sheet.cssRules[0];
    const container = document.createElement('div');
    const pf = document.createElement('div');
    pf.className = 'pf';
    pf.getBoundingClientRect = () => (rule.media.mediaText === 'all'
        ? { width: 0, height: 0 }
        : { width: 1024, height: 1325.171875 });
    container.appendChild(pf);
    const css = SH.download.applyPageSizes(container);
    assert.equal(css, '@page{size:1024px 1326px;margin:0;}@page ds-page-1{size:1024px 1326px;margin:0;}');
    assert.equal(rule.media.mediaText, 'print');
});

test('generatePDF opens the overlay, captures every page and enables printing', async () => {
    const { SH, document, window } = setup(
        { shape: 'all-free', pageCount: 2, states: { 1: 'text', 2: 'text' } },
        { fetch: () => Promise.resolve({ ok: false }) },
    );
    SH.download.generatePDF();
    const overlay = document.getElementById('ds-dl-overlay');
    assert.ok(overlay, 'overlay mounted');
    assert.ok(document.body.classList.contains('ds-dl-open'));
    assert.equal(overlay.querySelector('.ds-dl-meta').textContent, '2 trang');
    assert.equal(overlay.querySelector('.ds-dl-print').disabled, true);

    // Each page is polled until stable (>= 3 checks at 150ms) before cloning.
    await tick(2 * 3 * 150 + 400);
    assert.equal(overlay.querySelector('.ds-dl-loading'), null, 'loading state removed');
    assert.equal(overlay.querySelectorAll('.ds-dl-pages .pf').length, 2);
    assert.equal(overlay.querySelector('.ds-dl-print').disabled, false);

    // Esc closes it and restores the body class.
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(document.getElementById('ds-dl-overlay'), null);
    assert.ok(!document.body.classList.contains('ds-dl-open'));
});

test('generatePDF shows a notice instead of alert() when there are no pages', () => {
    const ctx = createWindow('<!doctype html><html><body><h1>Nothing</h1></body></html>');
    const SH = loadModules(ctx.window);
    SH.download.generatePDF();
    assert.equal(ctx.document.getElementById('ds-dl-overlay'), null);
    const notice = ctx.document.getElementById('ds-notice');
    assert.ok(notice);
    assert.match(notice.textContent, /không tìm thấy các trang tài liệu/);
});

test('refreshButton injects the download button once, and not when disabled', () => {
    {
        const { SH, document } = setup({ shape: 'all-free', pageCount: 1 });
        SH.download.refreshButton();
        SH.download.refreshButton();
        const buttons = document.querySelectorAll('#viewer-wrapper .download-button-1');
        assert.equal(buttons.length, 1);
        assert.equal(buttons[0].getAttribute('data-docusave'), 'download');
        assert.equal(buttons[0].textContent.includes('Tải xuống'), true);
    }
    {
        const { SH, document } = setup({ shape: 'all-free', pageCount: 1 });
        SH.settings.showDownloadButton = false;
        SH.download.refreshButton();
        assert.equal(document.querySelector('.download-button-1'), null);
    }
});

test('clicking the injected button starts the download and swallows the event', async () => {
    const { SH, document, window } = setup({ shape: 'all-free', pageCount: 1, states: { 1: 'text' } });
    SH.download.init();
    await tick(10); // jsdom fires DOMContentLoaded asynchronously
    const btn = document.querySelector('.download-button-1');
    assert.ok(btn);
    let reachedReact = false;
    btn.addEventListener('click', () => { reachedReact = true; });
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.ok(document.getElementById('ds-dl-overlay'), 'overlay opened on click');
    assert.equal(reachedReact, false, 'capture-phase handler stops the event');
    window.close();
});
