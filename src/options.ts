const reloadSlackTabs = () => {
    chrome.tabs.query({ url: 'https://*.slack.com/*' }, tabs => {
        tabs.filter(t => t.url.match(/^https:\/\/[^\.]+\.slack\.com/))
            .forEach(t => chrome.tabs.reload(t.id))
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
    }, () => {
        reloadSlackTabs();
        setTimeout(()=>window.close());
    });
});

const uninstall = document.getElementById('uninstall');
uninstall.addEventListener('click', e => {
    e.preventDefault();

    chrome.management.uninstallSelf({ showConfirmDialog: true });
})

const accept = document.getElementById('accept');
const html = document.querySelector('html');
accept.addEventListener('click', e => {
    e.preventDefault();

    chrome.storage.sync.set({
        'acceptedRisks': new Date()
    }, () => {
        chrome.browserAction.setBadgeText({text: ''});
        html.classList.remove('not-accepted');
        html.classList.add('accepted');
        reloadSlackTabs();
    });
})


setTimeout(() => {
    chrome.storage.sync.get(['acceptedRisks', 'settings'], res => {
        console.log(res.acceptedRisks);
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

if (document.URL.indexOf("fullpage=1") !== -1) {
    html.classList.add('full-page');
} else {
    html.classList.add('popup');
}