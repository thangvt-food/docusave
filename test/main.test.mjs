// End-to-end: all five content scripts, in manifest order, against a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, loadScripts, tick, CONTENT_SCRIPTS } from './helpers/dom.mjs';
import { documentFixture } from './fixtures/documents.mjs';
import { readFileSync } from 'node:fs';

const MANIFEST = JSON.parse(readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'));

test('manifest lists the content scripts in dependency order', () => {
    assert.deepEqual(CONTENT_SCRIPTS, [
        'content/common.js',
        'content/cleanup.js',
        'content/pages.js',
        'content/download.js',
        'content/main.js',
    ]);
});

test('manifest targets the same sites for content scripts and web accessible resources', () => {
    const sites = MANIFEST.content_scripts[0].matches;
    assert.ok(sites.length >= 4, 'expected every supported Studocu site');
    for (const pattern of sites) assert.match(pattern, /^https:\/\/www\.[a-z.]+\/\*$/);
    assert.deepEqual(MANIFEST.web_accessible_resources[0].matches, sites);
});

test('boot on a premium document: banners gone, gated pages labelled, settings applied', async () => {
    const ctx = createWindow(documentFixture({
        shape: 'text-with-gaps', pageCount: 3, freePages: [1],
        states: { 1: 'text', 2: 'blurred', 3: 'empty' },
        extraBody: '<div class="PremiumBannerBlobWrapper_x">upsell</div><div class="AdsContainer_x">ad</div>',
    }));
    const SH = loadScripts(ctx.window);
    await tick(20);

    const { document } = ctx;
    assert.equal(document.documentElement.getAttribute('data-ds-enabled'), 'on');
    assert.equal(document.documentElement.getAttribute('data-ds-ads'), 'hide');
    assert.equal(document.documentElement.getAttribute('data-ds-ai'), 'hide');
    assert.equal(document.documentElement.getAttribute('data-ds-download'), 'on');
    assert.equal(document.querySelector('[class*="PremiumBannerBlobWrapper"]'), null);
    assert.ok(document.querySelector('.AdsContainer_x'), 'ads are hidden by CSS, not removed');
    assert.ok(document.querySelector('#viewer-wrapper .download-button-1'), 'download button injected');
    assert.ok(document.querySelector('.docusave-logo-replaced'), 'logo replaced');

    const pfs = document.querySelectorAll('#viewer-wrapper .pf');
    assert.equal(pfs[0].querySelector('[data-ds-gated-note]'), null);
    assert.ok(pfs[1].querySelector('[data-ds-gated-note]'));
    assert.ok(pfs[2].querySelector('[data-ds-gated-note]'));

    const patched = JSON.parse(document.querySelector('#__NEXT_DATA__').textContent);
    assert.equal(patched.props.pageProps.documentAccess.hasBlurredPages, false, 'NEXT_DATA patched');
    assert.equal(SH.getDocumentAccessData().hasBlurredPages, true, 'model read before the patch');

    const errors = ctx.logs.filter((l) => l.startsWith('ERROR') || l.startsWith('JSDOM'));
    assert.deepEqual(errors, [], 'no runtime errors');
    ctx.window.close();
});

test('stored settings switch features off', async () => {
    const ctx = createWindow(documentFixture({ shape: 'all-free', pageCount: 1, states: { 1: 'text' } }), {
        storage: { hideAds: false, hideAiToolbar: false, replaceLogo: false, showDownloadButton: false, autoLoadPages: false },
    });
    loadScripts(ctx.window);
    await tick(20);
    const { document } = ctx;
    assert.equal(document.documentElement.getAttribute('data-ds-ads'), 'show');
    assert.equal(document.documentElement.getAttribute('data-ds-ai'), 'show');
    assert.equal(document.documentElement.getAttribute('data-ds-download'), 'off');
    assert.equal(document.querySelector('.download-button-1'), null);
    assert.equal(document.querySelector('.docusave-logo-replaced'), null);
    assert.ok(document.querySelector('[aria-label="Studocu Logo"]'));
    ctx.window.close();
});

test('the master switch off leaves the page exactly as Studocu rendered it', async () => {
    const ctx = createWindow(documentFixture({
        shape: 'text-with-gaps', pageCount: 2, freePages: [1],
        states: { 1: 'blurred', 2: 'blurred' },
        extraBody: '<div class="PremiumBannerBlobWrapper_x">upsell</div>',
    }), { storage: { enabled: false } });
    const SH = loadScripts(ctx.window);
    await tick(20);

    const { document } = ctx;
    assert.equal(document.documentElement.getAttribute('data-ds-enabled'), 'off');
    assert.ok(document.querySelector('[class*="PremiumBannerBlobWrapper"]'), 'banner left alone');
    assert.equal(document.querySelector('.download-button-1'), null, 'no download button');
    assert.equal(document.querySelector('.docusave-logo-replaced'), null, 'logo left alone');
    assert.equal(document.querySelector('[data-ds-gated-note]'), null, 'no labels added');
    document.querySelectorAll('#viewer-wrapper .pf img').forEach((img) => {
        assert.ok(img.getAttribute('src').includes('/pages/blurred/'), 'blurred previews untouched');
    });
    const data = JSON.parse(document.querySelector('#__NEXT_DATA__').textContent);
    assert.equal(data.props.pageProps.documentAccess.hasBlurredPages, true, 'NEXT_DATA untouched');
    assert.equal(SH.settings.enabled, false);
    ctx.window.close();
});

test('boots without errors on a page that is not a document', async () => {
    const ctx = createWindow('<!doctype html><html><body><main><h1>Search</h1></main></body></html>');
    loadScripts(ctx.window);
    await tick(20);
    const errors = ctx.logs.filter((l) => l.startsWith('ERROR') || l.startsWith('JSDOM'));
    assert.deepEqual(errors, []);
    ctx.window.close();
});

test('the popup renders the version and persists toggles', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { SRC } = await import('./helpers/dom.mjs');
    const html = fs.readFileSync(path.join(SRC, 'popup', 'popup.html'), 'utf8')
        .replace('<script src="popup.js"></script>', '');
    const ctx = createWindow(html, { storage: { hideAds: false }, url: 'chrome-extension://abc/popup/popup.html' });
    ctx.window.eval(fs.readFileSync(path.join(SRC, 'popup', 'popup.js'), 'utf8'));
    await tick(0);
    const { document } = ctx;
    assert.match(document.getElementById('version').textContent, /^v\d+\.\d+\.\d+$/);
    const ads = document.querySelector('input[data-setting="hideAds"]');
    const logo = document.querySelector('input[data-setting="replaceLogo"]');
    assert.equal(ads.checked, false, 'stored value shown');
    assert.equal(logo.checked, true, 'default shown');

    ads.checked = true;
    ads.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    assert.equal(JSON.stringify(ctx.storageWrites), JSON.stringify([{ hideAds: true }]));
    assert.match(document.getElementById('status').textContent, /Đã lưu/);
    ctx.window.close();
});

test('the popup master switch disables the other rows and reloads the active tab', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { SRC } = await import('./helpers/dom.mjs');
    const html = fs.readFileSync(path.join(SRC, 'popup', 'popup.html'), 'utf8')
        .replace('<script src="popup.js"></script>', '');
    const ctx = createWindow(html, {
        storage: { enabled: false, hideAds: true },
        url: 'chrome-extension://abc/popup/popup.html',
    });
    const messages = [];
    ctx.window.chrome.tabs = {
        query(_query, cb) { cb([{ id: 42 }]); },
        sendMessage(tabId, message, cb) { messages.push([tabId, message]); if (cb) cb(); },
    };
    ctx.window.eval(fs.readFileSync(path.join(SRC, 'popup', 'popup.js'), 'utf8'));
    await tick(0);
    const { document } = ctx;
    const master = document.querySelector('input[data-setting="enabled"]');
    const ads = document.querySelector('input[data-setting="hideAds"]');
    assert.equal(master.checked, false, 'stored master switch shown');
    assert.equal(ads.checked, true);
    assert.equal(ads.disabled, true, 'feature rows are inert while the extension is off');
    assert.ok(document.body.classList.contains('is-off'));

    master.checked = true;
    master.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    assert.equal(JSON.stringify(ctx.storageWrites), JSON.stringify([{ enabled: true }]));
    assert.equal(JSON.stringify(messages), JSON.stringify([[42, { type: 'docusave:reload' }]]));
    assert.equal(ads.disabled, false, 'feature rows come back when enabled');
    assert.match(document.getElementById('status').textContent, /Đã lưu/);
    ctx.window.close();
});
