chrome.runtime.onInstalled.addListener(d => {
    chrome.storage.sync.get(['acceptedRisks'], res => {
        if (!res.acceptedRisks) {
            chrome.tabs.create({ url: chrome.extension.getURL('options.html') + '?fullpage=1' });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'slackPageOpened') {
        chrome.pageAction.show(sender.tab.id);
    } else if (request.type === 'closeThisTab') {
        chrome.tabs.remove(sender.tab.id);
    }
});