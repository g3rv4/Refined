import availablePlugins from "./available_plugins";

const reloadSlackTabs = (callback?: () => void) => {
    chrome.tabs.query({ url: "https://*.slack.com/*" }, tabs => {
        let tabsRemaining = tabs.length;
        if (tabsRemaining) {
            tabs.forEach(t => chrome.tabs.reload(t.id, null, () => {
                tabsRemaining--;
                if (tabsRemaining === 0 && callback) {
                    callback();
                }
            }));
        } else if (callback) {
            callback();
        }
    });
};

const form = document.getElementById("the-form");
form.addEventListener("submit", e => {
    e.preventDefault();

    const formData = new FormData(form as HTMLFormElement);
    const newSettings: any = {};
    formData.forEach((value, key) => {
        const parts = key.split(".");
        const lastKey = parts.pop();
        let current = newSettings;
        for (const currentKey of parts) {
            if (!current[currentKey]) {
                current[currentKey] = {};
            }
            current = current[currentKey];
        }
        current[lastKey] = value;
    });

    chrome.storage.sync.get(["acceptedRisks", "pluginSettings"], res => {
        const currentSettings = JSON.parse(res.pluginSettings || "{}");

        const plugins = Object.keys(availablePlugins);
        for (const pluginName of plugins) {
            newSettings[pluginName] = availablePlugins[pluginName].GenerateSettingsFromForm(currentSettings[pluginName], newSettings[pluginName]);
        }

        const json = JSON.stringify(newSettings);

        chrome.storage.sync.set({
            pluginSettings: json
        }, () => reloadSlackTabs(closePopup));
    });
});

document.querySelectorAll("a").forEach(e => {
    e.addEventListener("click", el => {
        el.preventDefault();

        chrome.tabs.create({ url: (el.target as HTMLAnchorElement).href }, closePopup);
    });
});

function closePopup(): void {
    if (document.URL.indexOf("fullpage=1") === -1) {
        window.close();
    } else {
        chrome.runtime.sendMessage({ type: "closeThisTab" });
    }
}

const uninstall = document.getElementById("uninstall");
uninstall.addEventListener("click", e => {
    e.preventDefault();

    chrome.management.uninstallSelf({ showConfirmDialog: true });

    return false;
});

// const accept = document.getElementById("accept");
// accept.addEventListener("click", e => {
//     e.preventDefault();

//     chrome.storage.sync.set({
//         acceptedRisks: new Date()
//     }, () => {
//         const htmlEl = document.querySelector("html");
//         htmlEl.classList.remove("not-accepted");
//         htmlEl.classList.add("accepted");
//         reloadSlackTabs();
//     });
// });

setTimeout(() => {
    chrome.storage.sync.get(["acceptedRisks", "pluginSettings"], res => {
        const htmlEl = document.querySelector("html");
        if (res.acceptedRisks) {
            htmlEl.classList.add("accepted");
        } else {
            htmlEl.classList.add("not-accepted");
        }
        htmlEl.classList.remove("loading");

        const settings = JSON.parse(res.pluginSettings || "{}");

        for (const pluginName of Object.keys(settings)) {
            for (const key of Object.keys(settings[pluginName])) {
                const elem = document.getElementById(`${pluginName}.${key}`) as HTMLInputElement;
                if (elem) {
                    if (elem.type === "checkbox") {
                        elem.checked = !!settings[pluginName][key];
                    } else {
                        elem.value = settings[pluginName][key];
                    }
                }
            }
        }
    });
}, 100);

const html = document.querySelector("html");
if (document.URL.indexOf("fullpage=1") !== -1) {
    html.classList.add("full-page");
} else {
    html.classList.add("popup");
}

// const manifestData = chrome.runtime.getManifest();
// document.getElementById("version").innerText = manifestData.version;
