function injectScript(source: (data: string) => void, data: string) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}

chrome.storage.sync.get(['settings'], res => {
    injectScript(function (settings: any) {
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
            my_id = data.self.id;

            data.history.messages = filterMessages(data.history.messages);
            bindResponse(request, JSON.stringify(data));
        }

        function processConversations(request) {
            const data = JSON.parse(request.responseText);
            data.messages = filterMessages(data.messages);

            bindResponse(request, JSON.stringify(data));
        }

        var my_id = '';
        var proxied = (window as any).XMLHttpRequest.prototype.open;
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
            } else if (path.startsWith('/api/chat.postMessage')) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const finalText = e.get('text').replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    e.set('text', finalText);
                    oldSend(e);
                }.bind(this);
                console.log(path);
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
                        if (hidden_ids.indexOf(data.user) !== -1) {
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

        if (settings.hangout_url) {
            // need to wait until we have the objects
            const hangoutInterval = setInterval(() => {
                const w: any = window;
                if (w.TS && w.TS.view && w.TS.view.submit) {
                    clearInterval(hangoutInterval);
                } else {
                    return;
                }

                var originalSubmit = w.TS.view.submit;
                var re = /@([^@>]+)>/g

                w.TS.view.submit = function () {
                    var message = w.TS.utility.contenteditable.value(w.TS.client.ui.$msg_input);
                    var lMessage = message.toLowerCase();
                    var userNames = [w.TS.model.user.profile.display_name];
                    var match;

                    if (lMessage.indexOf("hangout ") === 0) {
                        var name = message.substring(8);
                        var url;

                        while (match = re.exec(name)) {
                            userNames.push(match[1]);
                        }

                        if (userNames.length > 1) {
                            userNames = userNames.map(u => u.normalize('NFD').replace(/[\u0300-\u036f]/g, ""));
                            userNames.sort();
                            url = userNames.join('-');
                        } else {
                            // just use the text separated by hyphens
                            url = name.replace(' ', '-');
                        }

                        url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                        w.TS.utility.contenteditable.value(w.TS.client.ui.$msg_input, `hangout ${name}: ${settings.hangout_url.replace('$name$', url)}`);
                    }

                    return originalSubmit();
                }
            }, 500);
        }

        if (settings.threads_on_channel) {
            // always reply to the channel... TODO: Don't use DOMNodeInserted
            document.addEventListener('DOMNodeInserted', function (e) {
                const cl = (e.target as any).classList;
                if (cl && cl.contains('reply_container_info')) {
                    [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                        el.setAttribute('checked', 'true');
                    });
                }
            });
        }

        let css = '';
        if (settings.hide_status_emoji) {
            css += `
.c-message__content_header .emoji-outer.emoji-sizer {
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

        if (css) {
            var sheet = document.createElement('style');
            sheet.type = 'text/css';
            (window as any).customSheet = sheet;
            (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
            sheet.appendChild(document.createTextNode(css));
        }

        // Fix edit on a message with a link
        var intervalMessageEdit = setInterval(() => {
            const w: any = window;
            if (w.TS && w.TS.format) {
                clearInterval(intervalMessageEdit);
            } else {
                return
            }

            let old = w.TS.format.formatWithOptions;
            w.TS.format.formatWithOptions = (t,n,r) => {
                t = t.replace(/<([^<>\|]+)\|([^<>]+)>/g, (_, url, title)=> `[${title}](${url})`);
                return old(t,n,r);
            }
        }, 200);

        // I had to
        var interval = setInterval(() => {
            var targetNode = document.querySelector(".messages_header");
            if (targetNode) {
                clearInterval(interval);
            } else {
                return;
            }
            var observerOptions = {
                childList: true,
                attributes: true,
                subtree: true
            }

            var observer = new MutationObserver((e, observer) => {
                var text = document.getElementById('channel_topic_text');
                if (text && text.innerText === 'Not the Slack complaint room.') {
                    text.innerHTML = '<strike>Not</strike> the Slack <strike>complaint</strike> <span style="color: red; font-weight: bold">modding</span> room.';
                }
            });
            observer.observe(targetNode, observerOptions);
        }, 200);

    }, res.settings || '{}');
});