import availablePlugins from './available_plugins.js';

const reloadSlackTabs = (callback?: () => void) => {
    chrome.tabs.query({ url: 'https://*.slack.com/*' }, tabs => {
        let tabsRemaining = tabs.length;
        if (tabsRemaining) {
            tabs.forEach(t => chrome.tabs.reload(t.id, null, () => {
                tabsRemaining--;
                if (tabsRemaining == 0 && callback) {
                    callback();
                }
            }))
        } else if (callback) {
            callback();
        }
    });
};

const form = document.getElementById('the-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    var formData = new FormData(form as HTMLFormElement);
    var newSettings: any = {};
    formData.forEach(function (value, key) {
        const parts = key.split('.');
        const lastKey = parts.pop();
        let current = newSettings;
        for (let currentKey of parts) {
            if (!current[currentKey]) {
                current[currentKey] = {};
            }
            current = current[currentKey];
        }
        current[lastKey] = value;
    });

    chrome.storage.sync.get(['acceptedRisks', 'pluginSettings'], res => {
        let currentSettings = JSON.parse(res.pluginSettings || '{}');

        const plugins = Object.keys(availablePlugins);
        for (let pluginName of plugins) {
            newSettings[pluginName] = availablePlugins[pluginName].GenerateSettingsFromForm(currentSettings[pluginName], newSettings[pluginName]);
        }

        var json = JSON.stringify(newSettings);

        chrome.storage.sync.set({
            'pluginSettings': json
        }, () => reloadSlackTabs(closePopup));
    });
});

document.querySelectorAll('.visit-site').forEach(e => {
    e.addEventListener('click', e => {
        e.preventDefault();

        chrome.tabs.create({ url: 'https://taut.rocks' }, closePopup);
    })
});

function closePopup() {
    if (document.URL.indexOf("fullpage=1") === -1) {
        window.close();
    } else {
        chrome.runtime.sendMessage({ type: 'closeThisTab' });
    }
}

const uninstall = document.getElementById('uninstall');
uninstall.addEventListener('click', e => {
    e.preventDefault();

    chrome.management.uninstallSelf({ showConfirmDialog: true });
})

const accept = document.getElementById('accept');
accept.addEventListener('click', e => {
    e.preventDefault();

    chrome.storage.sync.set({
        'acceptedRisks': new Date()
    }, () => {
        const html = document.querySelector('html');
        html.classList.remove('not-accepted');
        html.classList.add('accepted');
        reloadSlackTabs();
    });
})


setTimeout(() => {
    chrome.storage.sync.get(['acceptedRisks', 'pluginSettings'], res => {
        const html = document.querySelector('html');
        if (res.acceptedRisks) {
            html.classList.add('accepted');
        } else {
            html.classList.add('not-accepted');
        }
        html.classList.remove('loading');

        const settings = JSON.parse(res.pluginSettings || '{}');

        for (let pluginName of Object.keys(settings)) {
            for (let key of Object.keys(settings[pluginName])) {
                const elem = document.getElementById(`${pluginName}.${key}`) as HTMLInputElement;
                if (elem) {
                    if (elem.type === 'checkbox') {
                        elem.checked = !!settings[pluginName][key];
                    } else {
                        elem.value = settings[pluginName][key];
                    }
                }
            }
        }
    })
}, 100)

const html = document.querySelector('html');
if (document.URL.indexOf("fullpage=1") !== -1) {
    html.classList.add('full-page');
} else {
    html.classList.add('popup');
}
