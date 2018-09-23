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
    } else if(request.type === 'muteUser') {
        debugger;
        chrome.storage.sync.get(['settings'], res => {
            const settings = JSON.parse(res.settings || '{}');
            const hidden_ids = settings.hidden_ids ? settings.hidden_ids.split(",").map(s => s.trim()) : [];
            if (request.type === 'muteUser') {
                if(hidden_ids.indexOf(request.userId) === -1){
                    hidden_ids.push(request.userId);
                }
                settings.hidden_ids = hidden_ids.join(', ');
            }

            var json = JSON.stringify(settings);
            chrome.storage.sync.set({
                'settings': json
            }, () =>{
                chrome.tabs.reload(sender.tab.id);
            });
        })
    }
});