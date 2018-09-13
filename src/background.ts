chrome.runtime.onInstalled.addListener(d => {
    chrome.browserAction.disable();
    chrome.storage.sync.get(['acceptedRisks'], res => {
        if (!res.acceptedRisks) {
            chrome.tabs.create({ url: chrome.extension.getURL('options.html') + '?fullpage=1' });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "slackWithoutAccepted"){
        chrome.browserAction.setBadgeText({text: '!', tabId: sender.tab.id});
    } else if (request.type === 'slackPageOpened'){
        chrome.browserAction.enable(sender.tab.id);
    }
});