// DocuSave - toolbar popup.
//
// Reads and writes the same settings the content scripts read on load (see
// DEFAULT_SETTINGS in content/common.js). Kept dependency-free on purpose.

(function () {
    'use strict';

    const DEFAULTS = {
        enabled: true,
        hideAds: true,
        hideAiToolbar: true,
        replaceLogo: true,
        showDownloadButton: true,
        autoLoadPages: true,
    };

    const IDLE_STATUS = 'Thay đổi được áp dụng ở lần tải trang tài liệu tiếp theo.';

    const api = globalThis.chrome;
    const inputs = Array.from(document.querySelectorAll('input[data-setting]'));
    const status = document.getElementById('status');
    const versionEl = document.getElementById('version');

    try {
        versionEl.textContent = 'v' + api.runtime.getManifest().version;
    } catch (e) {
        versionEl.textContent = '';
    }

    function value(settings, key) {
        return typeof settings[key] === 'boolean' ? settings[key] : DEFAULTS[key];
    }

    function setEnabledState(enabled) {
        document.body.classList.toggle('is-off', !enabled);
        inputs.forEach(function (input) {
            if (input.dataset.setting !== 'enabled') input.disabled = !enabled;
        });
    }

    function render(settings) {
        inputs.forEach(function (input) {
            const key = input.dataset.setting;
            input.checked = value(settings, key);
        });
        setEnabledState(value(settings, 'enabled'));
    }

    function flash(text) {
        status.textContent = text;
        status.classList.add('saved');
        clearTimeout(flash.timer);
        flash.timer = setTimeout(function () {
            status.classList.remove('saved');
            status.textContent = IDLE_STATUS;
        }, 1600);
    }

    // The content script reloads itself so a disabled extension leaves no
    // observers behind and a re-enabled one can undo whatever React restored.
    function reloadActiveTab() {
        if (!api.tabs || !api.tabs.query || !api.tabs.sendMessage) return;
        api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs && tabs[0];
            if (!tab || typeof tab.id !== 'number') return;
            api.tabs.sendMessage(tab.id, { type: 'docusave:reload' }, function () {
                if (api.runtime && api.runtime.lastError) void api.runtime.lastError.message;
            });
        });
    }

    api.storage.sync.get(DEFAULTS, function (stored) {
        render(stored || DEFAULTS);
    });

    inputs.forEach(function (input) {
        input.addEventListener('change', function () {
            const key = input.dataset.setting;
            const patch = {};
            patch[key] = input.checked;
            api.storage.sync.set(patch, function () {
                if (key === 'enabled') {
                    setEnabledState(input.checked);
                    reloadActiveTab();
                    flash('Đã lưu. Đang tải lại trang tài liệu...');
                } else {
                    flash('Đã lưu. Tải lại trang tài liệu để áp dụng.');
                }
            });
        });
    });
})();
