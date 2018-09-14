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
    var object: any = {};
    formData.forEach(function (value, key) {
        object[key] = value;
    });

    var json = JSON.stringify(object);

    chrome.storage.sync.set({
        'settings': json
    }, () => reloadSlackTabs(closePopup));
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
    chrome.storage.sync.get(['acceptedRisks', 'settings'], res => {
        const html = document.querySelector('html');
        if (res.acceptedRisks) {
            html.classList.add('accepted');
        } else {
            html.classList.add('not-accepted');
        }
        html.classList.remove('loading');

        const settings = JSON.parse(res.settings || '{}');

        let e: any = document.getElementById('hidden_ids');
        e.value = settings.hidden_ids || "";

        e = document.getElementById('hangout_url');
        e.value = settings.hangout_url || "";

        ['only_my_reactions', 'hide_gdrive_preview', 'threads_on_channel',
            'hide_status_emoji', 'reactions_on_the_right', 'hide_url_previews',
            'unread_on_title'].forEach(f => {
                if (settings[f]) {
                    document.getElementById(f).setAttribute('checked', 'true');
                }
            })
    })
}, 100)

const html = document.querySelector('html');
if (document.URL.indexOf("fullpage=1") !== -1) {
    html.classList.add('full-page');
} else {
    html.classList.add('popup');
}