import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createWindow, SRC } from './helpers/dom.mjs';

const SCRIPT = fs.readFileSync(path.join(SRC, 'background.js'), 'utf8');

function setup() {
    const ctx = createWindow('<!doctype html><html><body></body></html>');
    const listeners = {};
    const removed = [];
    const chrome = ctx.window.chrome;
    chrome.tabs = {
        onUpdated: { addListener(fn) { listeners.updated = fn; } },
        onRemoved: { addListener(fn) { listeners.removed = fn; } },
    };
    chrome.runtime.onInstalled = { addListener(fn) { listeners.installed = fn; } };
    chrome.cookies = {
        getAll(details, cb) {
            cb([{ name: 'sid', domain: '.' + details.domain, path: '/', secure: true }]);
        },
        remove(details, cb) {
            removed.push(details);
            if (cb) cb();
        },
    };
    ctx.window.eval(SCRIPT);
    return { ...ctx, listeners, removed, background: ctx.window.DocuSaveBackground };
}

test('supported sites are recognised and other URLs are not', () => {
    const { background } = setup();
    for (const url of [
        'https://www.studocu.com/en-us/document/test/1234',
        'https://www.studeersnel.nl/nl/document/test/1234',
        'https://www.studocu.vn/vn/tai-lieu/test/1234',
        'https://www.studocu.id/id/dokumen/test/1234',
        'https://studocu.com/',
    ]) {
        assert.equal(background.isSupportedUrl(url), true, url);
    }
    for (const url of [
        'https://example.com/',
        'https://notstudocu.com/',
        'https://doc-assets.studocu.com/file.png',
        '',
        null,
    ]) {
        assert.equal(background.isSupportedUrl(url), false, String(url));
    }
});

test('visiting a supported site clears the cookies of every supported domain', () => {
    const { background, removed } = setup();
    background.onTabUpdated(1, {
        status: 'loading',
        url: 'https://www.studocu.com/en-us/document/test/1234',
    }, { id: 1 });
    assert.equal(removed.length, 4);
    const urls = removed.map((d) => d.url).sort();
    assert.deepEqual(urls, [
        'https://studeersnel.nl/',
        'https://studocu.com/',
        'https://studocu.id/',
        'https://studocu.vn/',
    ]);
});

test('visiting an unrelated site leaves cookies alone', () => {
    const { background, removed } = setup();
    background.onTabUpdated(1, { status: 'loading', url: 'https://example.com/' }, { id: 1 });
    assert.equal(removed.length, 0);
});

test('the same navigation does not clear twice', () => {
    const { background, removed } = setup();
    const details = { status: 'loading', url: 'https://www.studocu.com/document/1' };
    background.onTabUpdated(1, details, { id: 1 });
    background.onTabUpdated(1, details, { id: 1 });
    assert.equal(removed.length, 4, 'one clear per navigation');
    background.onTabUpdated(1, { status: 'loading', url: 'https://www.studocu.com/document/2' }, { id: 1 });
    assert.equal(removed.length, 8, 'a different page clears again');
});

test('installing the extension clears cookies left from before', () => {
    const { listeners, removed } = setup();
    assert.equal(typeof listeners.installed, 'function');
    listeners.installed();
    assert.equal(removed.length, 4);
});
