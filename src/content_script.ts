window.addEventListener("message", event => {
    if (event.source === window && event.data && event.data.type && event.data.type.startsWith("refined.")) {
        chrome.runtime.sendMessage(event.data);
    }
});

chrome.storage.sync.get(["acceptedRisks", "pluginSettings"], res => {
    chrome.runtime.sendMessage({ type: "slackPageOpened" });
    if (!res.acceptedRisks) {
        return;
    }

    const injectedScript = document.createElement("script");
    injectedScript.innerText = `(${loadContent.toString()})()`;
    injectedScript.type = "text/javascript";
    injectedScript.dataset.settings = res.pluginSettings;
    injectedScript.dataset.extensionBaseUrl = chrome.runtime.getURL("");
    injectedScript.id = "refined-injected-script";
    document.head.appendChild(injectedScript);
});

function loadContent() {
    return "placeholder";
}
