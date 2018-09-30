window.addEventListener("message", event => {
    if (event.source == window && event.data && event.data.type && event.data.type.startsWith('taut.')) {
        chrome.runtime.sendMessage(event.data);
    }
});

chrome.storage.sync.get(['acceptedRisks', 'pluginSettings'], res => {
    chrome.runtime.sendMessage({ type: 'slackPageOpened' });
    if (!res.acceptedRisks) {
        return;
    }

    var script = document.createElement("script");
    script.type = "module";
    script.src = chrome.extension.getURL('injected_script.js');
    script.dataset.settings = res.pluginSettings;
    script.id = 'taut-injected-script';
    document.documentElement.appendChild(script);


//         function filterMessages(messages) {

//             // remove reactions and files
//             messages = messages.map(m => {
//                 if (m.files && settings.hide_gdrive_preview) {
//                     m.files = m.files.filter(f => f.external_type !== "gdrive");
//                     if (!m.files.length) {
//                         delete m.files;
//                     }
//                 }
//                 return m;
//             });

//             return messages;
//         }

//         // proxy the window.WebSocket object
//         var WebSocketProxy = new Proxy((window as any).WebSocket, {
//             construct: function (target, args) {
//                 function bindWebSocketData(event, data) {
//                     event.__defineGetter__("data", function () {
//                         return data;
//                     });
//                 }

//                 // create WebSocket instance
//                 const instance = new target(...args);

//                 const messageHandler = (event) => {
//                     let data = JSON.parse(event.data);

//                     } else if (data.type === "message") {

//                         // hide gdrive if needed
//                         if (settings.hide_gdrive_preview && data.message && data.message.files) {
//                             data.message.files = data.message.files.filter(f => f.external_type !== "gdrive");
//                             if (!data.message.files.length) {
//                                 delete data.message.files;
//                             }
//                         }

//                     }

//                     bindWebSocketData(event, JSON.stringify(data));
//                 };
//                 instance.addEventListener('message', messageHandler);

//                 // return the WebSocket instance
//                 return instance;
//             }
//         });



});
