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
//                 if (m.reactions && settings.only_my_reactions) {
//                     if (m.user != my_id) {
//                         m.reactions = m.reactions.filter(r => r.users.indexOf(my_id) !== -1);
//                     }
//                     if (!m.reactions.length) {
//                         delete m.reactions;
//                     }
//                 }
//                 if (m.files && settings.hide_gdrive_preview) {
//                     m.files = m.files.filter(f => f.external_type !== "gdrive");
//                     if (!m.files.length) {
//                         delete m.files;
//                     }
//                 }
//                 if (m.attachments && settings.hide_url_previews) {
//                     m.attachments = m.attachments.filter(m => !m.from_url);
//                     if (!m.attachments) {
//                         delete m.attachments;
//                     }
//                 }
//                 return m;
//             });

//             return messages;
//         }


//         var my_id = '';
//         var proxied = (window as any).XMLHttpRequest.prototype.open;
//         const re = /<@([^>]+)>/g;
//         (window as any).XMLHttpRequest.prototype.open = function (method, path, async) {

//             } else if (path.startsWith('/api/chat.postMessage') || path.startsWith('/api/chat.update')) {
//                 const oldSend = this.send.bind(this);
//                 this.send = function (e) {

//                     if (e.get('reply_broadcast') === "true") {
//                         [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
//                             (el as any).checked = true;
//                         });
//                     }

//                     e.set('text', finalText);
//                     oldSend(e);
//                 }.bind(this);
//             }
//             return proxied.apply(this, [].slice.call(arguments));
//         };

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

//                     if (data.type === "reaction_added" && settings.only_my_reactions) {
//                         if (data.user != my_id && data.item_user != my_id) {
//                             data = {};
//                         }
//                     } else if (data.type === "message") {
//                         // when it comes with an attachment, it's in here
//                         if (data.message && data.message.text) {
//                             data.message.text = data.message.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
//                         }

//                         // hide gdrive if needed
//                         if (settings.hide_gdrive_preview && data.message && data.message.files) {
//                             data.message.files = data.message.files.filter(f => f.external_type !== "gdrive");
//                             if (!data.message.files.length) {
//                                 delete data.message.files;
//                             }
//                         }

//                         // hide preview urls if needed
//                         if (settings.hide_url_previews && data.message && data.message.attachments) {
//                             data.message.attachments = data.message.attachments.filter(m => !m.from_url);
//                             if (!data.message.attachments) {
//                                 delete data.message.attachments;
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

//         if (settings.threads_on_channel) {
//             // always reply to the channel... TODO: Don't use DOMNodeInserted
//             document.addEventListener('DOMNodeInserted', function (e) {
//                 const cl = (e.target as any).classList;
//                 if (cl && cl.contains('reply_container_info')) {
//                     [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
//                         (el as any).checked = true;
//                     });
//                 }
//             });
//         }

//         let css = `
// `;
//         if (settings.hide_status_emoji) {
//             css += `
// .c-custom_status, .message_current_status {
//     display: none !important;
// }`;
//         }
//         if (settings.reactions_on_the_right) {
//             css += `
// .c-reaction_bar {
//     position: absolute;
//     bottom: 5px;
//     right: 1.25rem;
// }
// .c-message__actions--menu-showing, .c-message__actions {
//     top: unset !important;
//     bottom: 28px;
// }
// @media screen and (max-width: 1100px) {
//     .c-reaction_bar {
//         display: none;
//     }
// }
// .c-reaction_add, .c-reaction_add:hover {
//     display: none !important;
// }
// `;
//         }

//         var sheet = document.createElement('style');
//         sheet.type = 'text/css';
//         (window as any).customSheet = sheet;
//         (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
//         sheet.appendChild(document.createTextNode(css));

//         if (settings.unread_on_title) {
//             // Avoid adding * or ! on the title
//             var targetNode = document.querySelector('title')
//             var config = { attributes: true, childList: true, subtree: true };
//             var callback = function () {
//                 if (document.title.startsWith('*') || document.title.startsWith('!')) {
//                     document.title = document.title.substring(2);
//                 }
//             };
//             var observer = new MutationObserver(callback);
//             observer.observe(targetNode, config);
//         }

//     }, JSON.stringify(res.settings));
});
