function injectScript(source: (data: string) => void, data: string) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.textContent = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}

window.addEventListener("message", (event) => {
    if (event.source == window &&
        event.data) {
        if (event.data.type === 'muteUser') {
            chrome.runtime.sendMessage({ type: 'muteUser', userId: event.data.userId });
        } else if (event.data.type === 'unmuteUsers') {
            chrome.runtime.sendMessage({ type: 'unmuteUsers', userIds: event.data.userIds });
        }
    }
});

chrome.storage.sync.get(['acceptedRisks', 'settings'], res => {
    chrome.runtime.sendMessage({ type: 'slackPageOpened' });
    if (!res.acceptedRisks) {
        return;
    }

    res.settings = JSON.parse(res.settings || '{}');

    injectScript(function (settings: any) {

        // me likey async/await
        // add the helper
        var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
            return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                step((generator = generator.apply(thisArg, _arguments || [])).next());
            });
        };
        ///////

        (window as any).Taut = {};

        const hidden_ids = settings.hidden_ids ? settings.hidden_ids.split(",").map(s => s.trim()) : [];

        function bindResponse(request, response) {
            request.__defineGetter__("responseText", function () {
                return response
            });
            request.__defineGetter__("response", function () {
                return response
            });
        }

        function filterMessages(messages) {
            // remove hidden bots
            messages = messages.filter(m => hidden_ids.indexOf(m.bot_id) === -1 && hidden_ids.indexOf(m.user) === -1);

            // remove reactions and files
            messages = messages.map(m => {
                if (m.text) {
                    m.text = m.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                }
                if (m.reactions && settings.only_my_reactions) {
                    if (m.user != my_id) {
                        m.reactions = m.reactions.filter(r => r.users.indexOf(my_id) !== -1);
                    }
                    if (!m.reactions.length) {
                        delete m.reactions;
                    }
                }
                if (m.files && settings.hide_gdrive_preview) {
                    m.files = m.files.filter(f => f.external_type !== "gdrive");
                    if (!m.files.length) {
                        delete m.files;
                    }
                }
                if (m.attachments && settings.hide_url_previews) {
                    m.attachments = m.attachments.filter(m => !m.from_url);
                    if (!m.attachments) {
                        delete m.attachments;
                    }
                }
                return m;
            });

            return messages;
        }

        function processConversationsView(request) {
            const data = JSON.parse(request.responseText);
            if (data.ok) {
                my_id = data.self.id;
                data.history.messages = filterMessages(data.history.messages);
                bindResponse(request, JSON.stringify(data));
            }
        }

        function processConversations(request) {
            const data = JSON.parse(request.responseText);

            if (data.ok) {
                data.messages = filterMessages(data.messages);
                bindResponse(request, JSON.stringify(data));
            }
        }

        var my_id = '';
        var proxied = (window as any).XMLHttpRequest.prototype.open;
        const re = /<@([^>]+)>/g;
        (window as any).XMLHttpRequest.prototype.open = function (method, path, async) {
            let oldListener = e => { };
            if (this.onreadystatechange) {
                oldListener = this.onreadystatechange.bind(this);
            }

            if (path == '/api/conversations.view') {
                this.onreadystatechange = e => {
                    if (this.readyState == 4) {
                        processConversationsView(this);
                    }
                    oldListener(e);
                }
            } else if (path.match(/\/api\/conversations\.history/)) {
                this.onreadystatechange = e => {
                    if (this.readyState == 4) {
                        processConversations(this);
                    }
                    oldListener(e);
                }
            } else if (path.match(/\/api\/conversations\.setTopic/)) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const originalTopic = e.get('topic');
                    let finalTopic = originalTopic.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    e.set('topic', finalTopic);
                    oldSend(e);
                }.bind(this);
            } else if (path.startsWith('/api/chat.postMessage') || path.startsWith('/api/chat.update')) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const originalText = e.get('text');
                    let finalText = originalText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    if (path.startsWith('/api/chat.update')) {
                        e.set('parse', 'none');
                    }

                    if (settings.hangout_url) {
                        const w: any = window;
                        var lMessage = finalText.toLowerCase();
                        const userIds = [w.TS.model.user.id];
                        var match;

                        if (lMessage.indexOf("hangout ") === 0) {
                            var name = finalText.substring(8);
                            var url;

                            while (match = re.exec(name)) {
                                userIds.push(match[1]);
                            }

                            if (userIds.length > 1) {
                                const userNames = w.TS.model.members.filter(m => userIds.indexOf(m.id) != -1)
                                    .map(m => m.profile.display_name_normalized);
                                userNames.sort();
                                url = userNames.join('-');
                            } else {
                                // just use the text separated by hyphens
                                url = name.replace(' ', '-');
                            }

                            url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                            finalText = `hangout ${name}: ${settings.hangout_url.replace('$name$', url)}`;
                        }
                    }

                    if (e.get('reply_broadcast') === "true") {
                        [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                            (el as any).checked = true;
                        });
                    }

                    e.set('text', finalText);
                    oldSend(e);
                }.bind(this);
            }
            return proxied.apply(this, [].slice.call(arguments));
        };

        // proxy the window.WebSocket object
        var WebSocketProxy = new Proxy((window as any).WebSocket, {
            construct: function (target, args) {
                function bindWebSocketData(event, data) {
                    event.__defineGetter__("data", function () {
                        return data;
                    });
                }

                // create WebSocket instance
                const instance = new target(...args);

                const messageHandler = (event) => {
                    let data = JSON.parse(event.data);

                    if (data.type === "reaction_added" && settings.only_my_reactions) {
                        if (data.user != my_id && data.item_user != my_id) {
                            data = {};
                        }
                    } else if (data.type === "message") {
                        // hide ignored users
                        if (hidden_ids.indexOf(data.user) !== -1 || hidden_ids.indexOf(data.bot_id) !== -1) {
                            data = {};
                        }

                        // did somebody send a markdown link? parse it!
                        if (data.text) {
                            data.text = data.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                        }

                        // when it comes with an attachment, it's in here
                        if (data.message && data.message.text) {
                            data.message.text = data.message.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                        }

                        // hide gdrive if needed
                        if (settings.hide_gdrive_preview && data.message && data.message.files) {
                            data.message.files = data.message.files.filter(f => f.external_type !== "gdrive");
                            if (!data.message.files.length) {
                                delete data.message.files;
                            }
                        }

                        // hide preview urls if needed
                        if (settings.hide_url_previews && data.message && data.message.attachments) {
                            data.message.attachments = data.message.attachments.filter(m => !m.from_url);
                            if (!data.message.attachments) {
                                delete data.message.attachments;
                            }
                        }

                        if (settings.unread_on_title) {
                            const w = window as any;
                            if (data.channel == w.TS.model.active_channel_id && data.user != my_id) {
                                // this is a bit weird... they always send a message, even if it's a message inside a thread
                                // they then send the message_repied event, and if it's a threaded message also sent to the channel
                                // then they send a message_changed event without an edited property
                                // what are you saying? that this is a hack? yes, the whole thing is
                                if (!data.subtype) {
                                    // it's a message...
                                    if (!data.thread_ts) {
                                        // it's not in a thread!
                                        w.CurrentUnread++;
                                    }
                                } else if (data.subtype === 'message_changed') {
                                    // message_changed, we still don't know much about it
                                    if (!data.message.edited) {
                                        // when a threaded message is sent to the chat, there's no edited property. Are there any
                                        // other instances when this happens? I have no freaking idea :)
                                        w.CurrentUnread++
                                    }
                                }

                                let title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                                if (w.CurrentUnread) {
                                    document.title = `(${w.CurrentUnread}) ${title}`;
                                } else {
                                    document.title = title;
                                }
                            }
                        }
                    }

                    bindWebSocketData(event, JSON.stringify(data));
                };
                instance.addEventListener('message', messageHandler);

                // return the WebSocket instance
                return instance;
            }
        });

        // replace the native WebSocket with the proxy
        (window as any).WebSocket = WebSocketProxy;

        if (settings.threads_on_channel) {
            // always reply to the channel... TODO: Don't use DOMNodeInserted
            document.addEventListener('DOMNodeInserted', function (e) {
                const cl = (e.target as any).classList;
                if (cl && cl.contains('reply_container_info')) {
                    [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                        (el as any).checked = true;
                    });
                }
            });
        }

        let css = `
.taut--muteLink {
    font-family: NotoSansJP,Slack-Lato,appleLogo,sans-serif;
    cursor: pointer;
    margin-left: 5px;
    opacity: 0;
}

.c-message--hover .taut--muteLink {
    opacity: 0.5;
}

.c-message--dense .taut--muteLink {
    display: none;
}
`;
        if (settings.hide_status_emoji) {
            css += `
.c-custom_status, .message_current_status {
    display: none !important;
}`;
        }
        if (settings.reactions_on_the_right) {
            css += `
.c-reaction_bar {
    position: absolute;
    bottom: 5px;
    right: 1.25rem;
}
.c-message__actions--menu-showing, .c-message__actions {
    top: unset !important;
    bottom: 28px;
}
@media screen and (max-width: 1100px) {
    .c-reaction_bar {
        display: none;
    }
}
.c-reaction_add, .c-reaction_add:hover {
    display: none !important;
}
`;
        }

        var sheet = document.createElement('style');
        sheet.type = 'text/css';
        (window as any).customSheet = sheet;
        (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
        sheet.appendChild(document.createTextNode(css));

        // Fix edit on a message with a link
        var intervalMessageEdit = setInterval(() => {
            const w: any = window;
            if (w.TS && w.TS.format) {
                clearInterval(intervalMessageEdit);
            } else {
                return
            }

            let old = w.TS.format.formatWithOptions;
            w.TS.format.formatWithOptions = (t, n, r) => {
                if (r && r.for_edit) {
                    t = t.replace(/<(?!!)([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
                }
                return old(t, n, r);
            }
        }, 200);

        // intercept clicks on the user names
        const intervalMainContainer = setInterval(() => {
            var targetNode = document.querySelector(".client_main_container");
            if (targetNode) {
                clearInterval(intervalMainContainer);
            } else {
                return;
            }

            var observerOptions = {
                childList: true,
                attributes: false,
                subtree: true
            }

            var observer = new MutationObserver((records, _) => {
                const headers = records.map(r => [...r.addedNodes] as any)
                    .reduce((a, b) => a.concat(b))
                    .map(e => {
                        if (e.querySelectorAll) {
                            const res = e.querySelectorAll('.c-message__sender_link');
                            if (res.length) {
                                return [...res];
                            }
                        }
                    })
                    .filter(e => e)
                    .reduce((a, b) => a.concat(b), []);

                headers.forEach(h => {
                    if (!h.dataset.taut) {
                        h.dataset.taut = "1";
                        h.onclick = e => {
                            const userId = e.target.href.split('/').pop();
                            (window as any).Taut.last_clicked = userId;
                        }
                    }
                })
            });
            observer.observe(targetNode, observerOptions);
        }, 200);

        const intervalClientUi = setInterval(() => {
            var targetNode = document.querySelector("#client-ui");
            if (targetNode) {
                clearInterval(intervalClientUi);
            } else {
                return;
            }

            var observerOptions = {
                childList: true,
                attributes: false,
                subtree: false
            }

            var observer = new MutationObserver((records, _) => {
                const menu = records.map(r => [...r.addedNodes] as any)
                    .reduce((a, b) => a.concat(b))
                    .filter(n => n.id === 'menu')[0];

                if (menu) {
                    const li: any = document.createElement('li');
                    const a = document.createElement('a');
                    a.innerText = "Mute user";
                    a.onclick = _ => {
                        const userId = (window as any).Taut.last_clicked
                        window.postMessage({
                            type: "muteUser",
                            userId
                        }, '*');
                    }
                    li.appendChild(a);

                    const items = menu.querySelector('#menu_items');
                    const firstDivider = items.querySelector('.divider');
                    items.insertBefore(li, firstDivider)
                }
            });

            observer.observe(targetNode, observerOptions);
        }, 200);

        // yup, the body can be null if this runs soon enough
        // this handles the unmute logic
        const intervalBody = setInterval(() => {
            if (document.body) {
                clearInterval(intervalBody);
            } else {
                return;
            }

            // listen for the modal creation
            const modalObserver = new MutationObserver((records, _) => {
                const nodes = records.map(r => [...r.addedNodes] as any)
                    .reduce((a, b) => a.concat(b));

                // this is the modal with application details
                const reactModal = nodes.filter(n => n.classList && n.classList.contains('ReactModalPortal'))[0];
                if (reactModal) {
                    const div = document.createElement('div');
                    div.className = 'c-menu_item__li';

                    const btn = document.createElement('button');
                    btn.onclick = _ => {
                        const userId = (window as any).Taut.last_clicked
                        window.postMessage({
                            type: "muteUser",
                            userId
                        }, '*');
                    };
                    btn.onmouseenter = e => {
                        document.querySelectorAll('.c-menu_item__button--highlighted').forEach(e => e.classList.remove('c-menu_item__button--highlighted'));
                        (e.target as HTMLButtonElement).classList.add('c-menu_item__button--highlighted');
                    }
                    btn.onmouseleave = e => {
                        (e.target as HTMLButtonElement).classList.remove('c-menu_item__button--highlighted');
                    }
                    div.appendChild(btn);
                    btn.className = 'c-button-unstyled c-menu_item__button';

                    const div2 = document.createElement('div');
                    btn.appendChild(div2);
                    div2.className = 'c-menu_item__label';
                    div2.innerText = 'Mute user';

                    const items = reactModal.querySelector('.c-menu__items');
                    const secondDivider = items.querySelectorAll('.c-menu_separator__li')[1];

                    items.insertBefore(div, secondDivider)
                }

                // this is the modal for the preferences
                const modal = nodes.filter(r => r.id === 'fs_modal')[0];
                if (modal) {
                    // add an observer to the contents_container element
                    const target = modal.querySelector('.contents');
                    if (target) {
                        const contentObserver = new MutationObserver(async (records, _) => {
                            const afterElement = records.map(r => [...r.addedNodes] as any)
                                .reduce((a, b) => a.concat(b))
                                .filter(r => r.id === 'prefs_inline_media')[0];

                            if (afterElement && hidden_ids.length) {
                                const form = document.createElement('form');

                                const h2 = document.createElement('h2');
                                h2.className = 'large_top_margin inline_block';
                                h2.textContent = 'Muted users';
                                form.appendChild(h2);

                                const p = document.createElement('p');
                                form.appendChild(p);

                                const w: any = window;
                                if (!w.Taut.users) {
                                    let response = await fetch('https://slack.com/api/users.list?token=' + w.TS.model.api_token);
                                    let json = await response.json();
                                    w.Taut.users = json.members.filter(u => !u.deleted);;
                                }
                                if (!w.Taut.bots) {
                                    let response = await fetch('https://slack.com/api/bots.list?token=' + w.TS.model.api_token);
                                    let json = await response.json();
                                    w.Taut.bots = json.bots.filter(b => !b.deleted);
                                }

                                const userIds = w.Taut.users.map(m => m.id);
                                const botIds = w.Taut.bots.map(b => b.id);

                                hidden_ids.forEach(userId => {
                                    let muted = undefined;
                                    if (userId[0] === 'U') {
                                        // it's a user
                                        if (userIds.indexOf(userId) !== -1) {
                                            muted = w.Taut.users.filter(m => m.id == userId)[0];
                                        }
                                    } else if (userId[0] === 'B') {
                                        // it's a bot
                                        if (botIds.indexOf(userId) !== -1) {
                                            muted = w.Taut.bots.filter(m => m.id == userId)[0];
                                        }
                                    }
                                    if (muted) {
                                        // the muted user is in this workspace!
                                        const current = document.createElement('label');
                                        current.className = 'checkbox';

                                        const input = document.createElement('input');
                                        input.value = "1";
                                        input.name = muted.id;
                                        input.type = 'checkbox';
                                        current.appendChild(input);

                                        const span = document.createElement('span');
                                        span.innerText = muted.profile ? muted.profile.real_name : muted.name;
                                        current.appendChild(span);

                                        p.appendChild(current);
                                    }
                                });

                                if (p.childElementCount > 0) {
                                    const btn = document.createElement('button');
                                    btn.type = 'submit';
                                    btn.className = 'btn btn_outline ladda-button';
                                    btn.innerText = 'Unmute the selected users';
                                    form.appendChild(btn);

                                    form.appendChild(document.createElement('hr'));

                                    form.onsubmit = e => {
                                        e.preventDefault();

                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const userIds = [];
                                        formData.forEach(function (_, key) {
                                            userIds.push(key);
                                        });

                                        if (userIds.length) {
                                            window.postMessage({
                                                type: "unmuteUsers",
                                                userIds
                                            }, '*');
                                        }
                                    }
                                    target.insertBefore(form, afterElement);
                                }
                            }
                        });
                        contentObserver.observe(target, { childList: true, attributes: false, subtree: false });
                    }
                }
            });

            modalObserver.observe(document.body, { childList: true, attributes: false, subtree: false });
        }, 200);

        if (settings.unread_on_title) {
            // Avoid adding * or ! on the title
            var targetNode = document.querySelector('title')
            var config = { attributes: true, childList: true, subtree: true };
            var callback = function () {
                if (document.title.startsWith('*') || document.title.startsWith('!')) {
                    document.title = document.title.substring(2);
                }
            };
            var observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
        }

        // react monkey patch
        var reactInterval = setInterval(() => {
            const w = window as any;
            if (w.React && w.React.createElement) {
                clearInterval(reactInterval);
            } else {
                return;
            }

            // Store the original function
            const originalCreateElement = w.React.createElement;

            // Define a new function
            w.React.createElement = function () {
                // Get our arguments as an array
                const args = Array.prototype.slice.call(arguments);

                const displayName = args[0].displayName;
                if (displayName) {
                    const props = args[1];
                    if (settings.unread_on_title) {
                        // make sure we unset the title marker when we have to
                        if (displayName === 'UnreadBanner') {
                            if (!props.hasUnreads && props.channelId) {
                                w.CurrentUnread = 0;
                                document.title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                            }
                        }
                    }
                }

                return originalCreateElement.apply(w.React, args);
            };
        }, 100);

    }, JSON.stringify(res.settings));
});
