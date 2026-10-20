// DocuSave - background script.
//
// Studocu serves an "Access Blocked" page after a burst of automated loads and
// keeps doing so until the cookies for the site are gone. That has nothing to
// do with the master switch, so the cookies are cleared on every visit to a
// supported site, whether the extension itself is on or off.

(function () {
    'use strict';

    const COOKIE_DOMAINS = ['studocu.com', 'studeersnel.nl', 'studocu.vn', 'studocu.id'];
    const SITE_URL = /^https?:\/\/(?:www\.)?(?:studocu\.com|studocu\.vn|studocu\.id|studeersnel\.nl)(?:[/?#]|$)/i;

    function isSupportedUrl(url) {
        return typeof url === 'string' && SITE_URL.test(url);
    }

    function clearCookies() {
        if (typeof chrome === 'undefined' || !chrome.cookies ||
            !chrome.cookies.getAll || !chrome.cookies.remove) return;
        COOKIE_DOMAINS.forEach(function (domain) {
            try {
                chrome.cookies.getAll({ domain: domain }, function (cookies) {
                    (cookies || []).forEach(function (cookie) {
                        const details = {
                            url: (cookie.secure ? 'https:' : 'http:') + '//' +
                                cookie.domain.replace(/^\./, '') + (cookie.path || '/'),
                            name: cookie.name,
                        };
                        if (cookie.storeId) details.storeId = cookie.storeId;
                        if (cookie.firstPartyDomain) details.firstPartyDomain = cookie.firstPartyDomain;
                        if (cookie.partitionKey) details.partitionKey = cookie.partitionKey;
                        try {
                            chrome.cookies.remove(details, function () {
                                if (chrome.runtime && chrome.runtime.lastError) void chrome.runtime.lastError.message;
                            });
                        } catch (e) { /* host access was revoked */ }
                    });
                });
            } catch (e) { /* host access was revoked */ }
        });
    }

    // tabs.onUpdated fires twice for a navigation (once with the new URL, once
    // with status "loading"), so remember what was cleared per tab and skip the
    // duplicate. A real navigation to another URL clears again.
    const lastCleared = {};
    function onTabUpdated(tabId, changeInfo, tab) {
        const url = (changeInfo && changeInfo.url) || (tab && tab.url);
        if (!isSupportedUrl(url)) return;
        if (!changeInfo || (changeInfo.status !== 'loading' && !changeInfo.url)) return;
        const previous = lastCleared[tabId];
        if (previous && previous.url === url && Date.now() - previous.at < 5000) return;
        lastCleared[tabId] = { url: url, at: Date.now() };
        clearCookies();
    }

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onUpdated) {
        chrome.tabs.onUpdated.addListener(onTabUpdated);
        chrome.tabs.onRemoved.addListener(function (tabId) {
            delete lastCleared[tabId];
        });
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
        chrome.runtime.onInstalled.addListener(clearCookies);
    }

    // Exposed for the test suite; content scripts never see this global.
    globalThis.DocuSaveBackground = {
        isSupportedUrl: isSupportedUrl,
        clearCookies: clearCookies,
        onTabUpdated: onTabUpdated,
    };
})();
