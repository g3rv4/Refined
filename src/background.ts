function injectScript(source: (data: string) => void, data: string) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}

chrome.storage.sync.get(['settings'], res => {
    const data = res.settings || '{}';
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

            // remove reactions and files (let's start with gdrive and see if I need to add more)
            messages = messages.map(m => {
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
                return m;
            });

            return messages;
        }

        function processConversationsView(request) {
            try {
                var data = JSON.parse(request.responseText);
            } catch (e) {
                return;
            }
            my_id = data.self.id;

            data.history.messages = filterMessages(data.history.messages);
            bindResponse(request, JSON.stringify(data));
        }

        function processConversations(request) {
            try {
                var data = JSON.parse(request.responseText);
            } catch (e) {
                return;
            }

            data.messages = filterMessages(data.messages);

            bindResponse(request, JSON.stringify(data));
        }

        var my_id = '';
        var proxied = (window as any).XMLHttpRequest.prototype.open;
        (window as any).XMLHttpRequest.prototype.open = function (method, path, async) {
            // clearInterval(interval);
            if (path == '/api/conversations.view') {
                this.addEventListener('readystatechange', function () {
                    processConversationsView(this);
                }, true);
            } else if (path.match(/\/api\/conversations\.history/)) {
                this.addEventListener('readystatechange', function () {
                    processConversations(this);
                }, true);
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
                    var data = JSON.parse(event.data);
                    if (data.type === "reaction_added" && settings.only_my_reactions) {
                        if (data.user != my_id && data.item_user != my_id) {
                            bindWebSocketData(event, "{}");
                            console.log('Ignoring reaction', data);
                        }
                    } else if (data.type === "message") {
                        if (hidden_ids.indexOf(data.user) !== -1) {
                            bindWebSocketData(event, "{}");
                        } else if (data.message && data.message.files && settings.hide_gdrive_preview) {
                            data.message.files = data.message.files.filter(f => f.external_type !== "gdrive");
                            if (!data.message.files.length) {
                                delete data.message.files;
                            }
                            bindWebSocketData(event, JSON.stringify(data));
                        }
                    }
                };
                instance.addEventListener('message', messageHandler);

                // return the WebSocket instance
                return instance;
            }
        });

        // replace the native WebSocket with the proxy
        (window as any).WebSocket = WebSocketProxy;
    }, data);
});