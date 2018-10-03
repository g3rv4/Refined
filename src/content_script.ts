window.addEventListener("message", event => {
    if (event.source === window && event.data && event.data.type && event.data.type.startsWith("taut.")) {
        chrome.runtime.sendMessage(event.data);
    }
});

chrome.storage.sync.get(["acceptedRisks", "pluginSettings"], res => {
    chrome.runtime.sendMessage({ type: "slackPageOpened" });
    if (!res.acceptedRisks) {
        return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.extension.getURL("injected_script.js");
    script.dataset.settings = res.pluginSettings;
    script.id = "taut-injected-script";
    document.documentElement.appendChild(script);
});
