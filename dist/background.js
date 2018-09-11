/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/background.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/background.ts":
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

function injectScript(source, data) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}
chrome.storage.sync.get(['settings'], res => {
    injectScript(function (settings) {
        const hidden_ids = settings.hidden_ids ? settings.hidden_ids.split(",").map(s => s.trim()) : [];
        function bindResponse(request, response) {
            request.__defineGetter__("responseText", function () {
                return response;
            });
            request.__defineGetter__("response", function () {
                return response;
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
        var proxied = window.XMLHttpRequest.prototype.open;
        const re = /<@([^>]+)>/g;
        window.XMLHttpRequest.prototype.open = function (method, path, async) {
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
                };
            }
            else if (path.match(/\/api\/conversations\.history/)) {
                this.onreadystatechange = e => {
                    if (this.readyState == 4) {
                        processConversations(this);
                    }
                    oldListener(e);
                };
            }
            else if (path.startsWith('/api/chat.postMessage') || path.startsWith('/api/chat.update')) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const originalText = e.get('text');
                    let finalText = originalText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    if (path.startsWith('/api/chat.update')) {
                        e.set('parse', 'none');
                    }
                    if (settings.hangout_url) {
                        const w = window;
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
                            }
                            else {
                                // just use the text separated by hyphens
                                url = name.replace(' ', '-');
                            }
                            url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                            finalText = `hangout ${name}: ${settings.hangout_url.replace('$name$', url)}`;
                        }
                    }
                    if (e.get('reply_broadcast') === "true") {
                        [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                            el.checked = true;
                        });
                    }
                    e.set('text', finalText);
                    oldSend(e);
                }.bind(this);
            }
            return proxied.apply(this, [].slice.call(arguments));
        };
        // proxy the window.WebSocket object
        var WebSocketProxy = new Proxy(window.WebSocket, {
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
                    }
                    else if (data.type === "message") {
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
                            const w = window;
                            if (data.channel == w.CurrentChannelId) {
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
                                }
                                else if (data.subtype === 'message_changed') {
                                    // message_changed, we still don't know much about it
                                    if (!data.message.edited) {
                                        // when a threaded message is sent to the chat, there's no edited property. Are there any
                                        // other instances when this happens? I have no freaking idea :)
                                        w.CurrentUnread++;
                                    }
                                }
                                let title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                                if (w.CurrentUnread) {
                                    document.title = `(${w.CurrentUnread}) ${title}`;
                                }
                                else {
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
        window.WebSocket = WebSocketProxy;
        if (settings.threads_on_channel) {
            // always reply to the channel... TODO: Don't use DOMNodeInserted
            document.addEventListener('DOMNodeInserted', function (e) {
                const cl = e.target.classList;
                if (cl && cl.contains('reply_container_info')) {
                    [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                        el.checked = true;
                    });
                }
            });
        }
        let css = '';
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
        if (css) {
            var sheet = document.createElement('style');
            sheet.type = 'text/css';
            window.customSheet = sheet;
            (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
            sheet.appendChild(document.createTextNode(css));
        }
        // Fix edit on a message with a link
        var intervalMessageEdit = setInterval(() => {
            const w = window;
            if (w.TS && w.TS.format) {
                clearInterval(intervalMessageEdit);
            }
            else {
                return;
            }
            let old = w.TS.format.formatWithOptions;
            w.TS.format.formatWithOptions = (t, n, r) => {
                if (r && r.for_edit) {
                    t = t.replace(/<([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
                }
                return old(t, n, r);
            };
        }, 200);
        // I had to
        var interval = setInterval(() => {
            var targetNode = document.querySelector(".messages_header");
            if (targetNode) {
                clearInterval(interval);
            }
            else {
                return;
            }
            var observerOptions = {
                childList: true,
                attributes: true,
                subtree: true
            };
            var observer = new MutationObserver((e, observer) => {
                var text = document.getElementById('channel_topic_text');
                if (text && text.innerText === 'Not the Slack complaint room.') {
                    text.innerHTML = '<strike>Not</strike> the Slack <strike>complaint</strike> <span style="color: red; font-weight: bold">modding</span> room.';
                }
            });
            observer.observe(targetNode, observerOptions);
        }, 200);
        if (settings.unread_on_title) {
            // Avoid adding * or ! on the title
            var targetNode = document.querySelector('title');
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
            const w = window;
            if (w.React && w.React.createElement) {
                clearInterval(reactInterval);
            }
            else {
                return;
            }
            // Store the original function
            const originalCreateElement = w.React.createElement;
            // Define a new function
            w.React.createElement = function () {
                // Get our arguments as an array
                const args = Array.prototype.slice.call(arguments);
                const response = originalCreateElement.apply(w.React, args);
                const displayName = args[0].displayName;
                if (displayName) {
                    const props = response.props;
                    if (settings.unread_on_title) {
                        // store the current channel id
                        if (displayName === 'MessagePane' && props.channelId) {
                            w.CurrentChannelId = props.channelId;
                        }
                        // make sure we unset the title marker when we have to
                        if (displayName === 'UnreadBanner' && props.channelId) {
                            if (!props.hasUnreads) {
                                w.CurrentUnread = 0;
                                document.title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                            }
                        }
                    }
                }
                return response;
            };
        }, 100);
    }, res.settings || '{}');
});


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2JhY2tncm91bmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0RBQTBDLGdDQUFnQztBQUMxRTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGdFQUF3RCxrQkFBa0I7QUFDMUU7QUFDQSx5REFBaUQsY0FBYztBQUMvRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQXlDLGlDQUFpQztBQUMxRSx3SEFBZ0gsbUJBQW1CLEVBQUU7QUFDckk7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7O0FBR0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDbEZBLFNBQVMsWUFBWSxDQUFDLE1BQThCLEVBQUUsSUFBWTtJQUM5RCxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQztJQUN4QyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDeEMsWUFBWSxDQUFDLFVBQVUsUUFBYTtRQUNoQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRWhHLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxRQUFRO1lBQ25DLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUU7Z0JBQ3JDLE9BQU8sUUFBUTtZQUNuQixDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQ2pDLE9BQU8sUUFBUTtZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxTQUFTLGNBQWMsQ0FBQyxRQUFRO1lBQzVCLHFCQUFxQjtZQUNyQixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUcsNkJBQTZCO1lBQzdCLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUU7b0JBQ1IsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO2lCQUNoRztnQkFDRCxJQUFJLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLGlCQUFpQixFQUFFO29CQUMzQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxFQUFFO3dCQUNqQixDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDeEU7b0JBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO3dCQUNyQixPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7cUJBQ3RCO2lCQUNKO2dCQUNELElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsbUJBQW1CLEVBQUU7b0JBQ3pDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7d0JBQ2pCLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztxQkFDbEI7aUJBQ0o7Z0JBQ0QsSUFBSSxDQUFDLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRTtvQkFDN0MsQ0FBQyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN2RCxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRTt3QkFDaEIsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDO3FCQUN4QjtpQkFDSjtnQkFDRCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxRQUFRLENBQUM7UUFDcEIsQ0FBQztRQUVELFNBQVMsd0JBQXdCLENBQUMsT0FBTztZQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5QyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUQsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDL0M7UUFDTCxDQUFDO1FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFPO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTlDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDVCxJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1FBQ0wsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNmLElBQUksT0FBTyxHQUFJLE1BQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUM1RCxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUM7UUFDeEIsTUFBYyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFVBQVUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLO1lBQ3pFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUN6QixXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNwRDtZQUVELElBQUksSUFBSSxJQUFJLHlCQUF5QixFQUFFO2dCQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQzFCLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLEVBQUU7d0JBQ3RCLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNsQztvQkFDRCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLENBQUM7YUFDSjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsRUFBRTtnQkFDcEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUMxQixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUFFO3dCQUN0QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDOUI7b0JBQ0QsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2FBQ0o7aUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO2dCQUN4RixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7b0JBQ25CLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ25DLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztvQkFDeEcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7d0JBQ3JDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO3FCQUMxQjtvQkFFRCxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7d0JBQ3RCLE1BQU0sQ0FBQyxHQUFRLE1BQU0sQ0FBQzt3QkFDdEIsSUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUN2QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDckMsSUFBSSxLQUFLLENBQUM7d0JBRVYsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTs0QkFDcEMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxHQUFHLENBQUM7NEJBRVIsT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQ0FDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDMUI7NEJBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQ0FDcEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FDQUN4QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0NBQ2pGLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQ0FDakIsR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7NkJBQzdCO2lDQUFNO2dDQUNILHlDQUF5QztnQ0FDekMsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDOzZCQUNoQzs0QkFFRCxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDOzRCQUMzRSxTQUFTLEdBQUcsV0FBVyxJQUFJLEtBQUssUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7eUJBQ2pGO3FCQUNKO29CQUVELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLE1BQU0sRUFBRTt3QkFDckMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFOzRCQUN2RSxFQUFVLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzt3QkFDL0IsQ0FBQyxDQUFDLENBQUM7cUJBQ047b0JBRUQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDZixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hCO1lBQ0QsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQztRQUVGLG9DQUFvQztRQUNwQyxJQUFJLGNBQWMsR0FBRyxJQUFJLEtBQUssQ0FBRSxNQUFjLENBQUMsU0FBUyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxVQUFVLE1BQU0sRUFBRSxJQUFJO2dCQUM3QixTQUFTLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJO29CQUNsQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFO3dCQUMzQixPQUFPLElBQUksQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFFRCw0QkFBNEI7Z0JBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBRXJDLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQzdCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUVsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLElBQUksUUFBUSxDQUFDLGlCQUFpQixFQUFFO3dCQUM5RCxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxFQUFFOzRCQUMvQyxJQUFJLEdBQUcsRUFBRSxDQUFDO3lCQUNiO3FCQUNKO3lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7d0JBQ2hDLHFCQUFxQjt3QkFDckIsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTs0QkFDaEYsSUFBSSxHQUFHLEVBQUUsQ0FBQzt5QkFDYjt3QkFFRCwrQ0FBK0M7d0JBQy9DLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTs0QkFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7eUJBQ3RHO3dCQUVELGlEQUFpRDt3QkFDakQsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFOzRCQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQzt5QkFDdEg7d0JBRUQsd0JBQXdCO3dCQUN4QixJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFOzRCQUNwRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDOzRCQUNsRixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO2dDQUM1QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDOzZCQUM3Qjt5QkFDSjt3QkFFRCw4QkFBOEI7d0JBQzlCLElBQUksUUFBUSxDQUFDLGlCQUFpQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7NEJBQ3hFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUM3RSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7Z0NBQzNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7NkJBQ25DO3lCQUNKO3dCQUVELElBQUksUUFBUSxDQUFDLGVBQWUsRUFBRTs0QkFDMUIsTUFBTSxDQUFDLEdBQUcsTUFBYSxDQUFDOzRCQUN4QixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLGdCQUFnQixFQUFFO2dDQUNwQyw0RkFBNEY7Z0NBQzVGLG1HQUFtRztnQ0FDbkcsb0VBQW9FO2dDQUNwRSxvRUFBb0U7Z0NBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO29DQUNmLG9CQUFvQjtvQ0FDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7d0NBQ2pCLHdCQUF3Qjt3Q0FDeEIsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO3FDQUNyQjtpQ0FDSjtxQ0FBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssaUJBQWlCLEVBQUU7b0NBQzNDLHFEQUFxRDtvQ0FDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO3dDQUN0Qix5RkFBeUY7d0NBQ3pGLGdFQUFnRTt3Q0FDaEUsQ0FBQyxDQUFDLGFBQWEsRUFBRTtxQ0FDcEI7aUNBQ0o7Z0NBRUQsSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ3JFLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRTtvQ0FDakIsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxhQUFhLEtBQUssS0FBSyxFQUFFLENBQUM7aUNBQ3BEO3FDQUFNO29DQUNILFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2lDQUMxQjs2QkFDSjt5QkFDSjtxQkFDSjtvQkFFRCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDLENBQUM7Z0JBQ0YsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFFckQsZ0NBQWdDO2dCQUNoQyxPQUFPLFFBQVEsQ0FBQztZQUNwQixDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzdDLE1BQWMsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDO1FBRTNDLElBQUksUUFBUSxDQUFDLGtCQUFrQixFQUFFO1lBQzdCLGlFQUFpRTtZQUNqRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDO2dCQUNwRCxNQUFNLEVBQUUsR0FBSSxDQUFDLENBQUMsTUFBYyxDQUFDLFNBQVMsQ0FBQztnQkFDdkMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO29CQUMzQyxDQUFDLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ3ZFLEVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO29CQUMvQixDQUFDLENBQUMsQ0FBQztpQkFDTjtZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRTtZQUM1QixHQUFHLElBQUk7OztFQUdqQixDQUFDO1NBQ007UUFDRCxJQUFJLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRTtZQUNqQyxHQUFHLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtCbEIsQ0FBQztTQUNPO1FBRUQsSUFBSSxHQUFHLEVBQUU7WUFDTCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLEtBQUssQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQ3ZCLE1BQWMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0UsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxvQ0FBb0M7UUFDcEMsSUFBSSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFRLE1BQU0sQ0FBQztZQUN0QixJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JCLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNO2dCQUNILE9BQU07YUFDVDtZQUVELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO1lBQ3hDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDakIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztpQkFDckY7Z0JBQ0QsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QixDQUFDO1FBQ0wsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsV0FBVztRQUNYLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzVELElBQUksVUFBVSxFQUFFO2dCQUNaLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUMzQjtpQkFBTTtnQkFDSCxPQUFPO2FBQ1Y7WUFDRCxJQUFJLGVBQWUsR0FBRztnQkFDbEIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLE9BQU8sRUFBRSxJQUFJO2FBQ2hCO1lBRUQsSUFBSSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLCtCQUErQixFQUFFO29CQUM1RCxJQUFJLENBQUMsU0FBUyxHQUFHLDRIQUE0SCxDQUFDO2lCQUNqSjtZQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEQsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFO1lBQzFCLG1DQUFtQztZQUNuQyxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNoRCxJQUFJLE1BQU0sR0FBRyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDbEUsSUFBSSxRQUFRLEdBQUc7Z0JBQ1gsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDbEUsUUFBUSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDaEQ7WUFDTCxDQUFDLENBQUM7WUFDRixJQUFJLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3hDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDakMsTUFBTSxDQUFDLEdBQUcsTUFBYSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDbEMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNILE9BQU87YUFDVjtZQUVELDhCQUE4QjtZQUM5QixNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBRXBELHdCQUF3QjtZQUN4QixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRztnQkFDcEIsZ0NBQWdDO2dCQUNoQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRW5ELE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUN4QyxJQUFJLFdBQVcsRUFBRTtvQkFDYixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUM3QixJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7d0JBQzFCLCtCQUErQjt3QkFDL0IsSUFBSSxXQUFXLEtBQUssYUFBYSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUU7NEJBQ2xELENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO3lCQUN4Qzt3QkFFRCxzREFBc0Q7d0JBQ3RELElBQUksV0FBVyxLQUFLLGNBQWMsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFOzRCQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRTtnQ0FDbkIsQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0NBQ3BCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7NkJBQzdFO3lCQUNKO3FCQUNKO2lCQUNKO2dCQUVELE9BQU8sUUFBUSxDQUFDO1lBQ3BCLENBQUMsQ0FBQztRQUNOLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVaLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImJhY2tncm91bmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL3NyYy9iYWNrZ3JvdW5kLnRzXCIpO1xuIiwiZnVuY3Rpb24gaW5qZWN0U2NyaXB0KHNvdXJjZTogKGRhdGE6IHN0cmluZykgPT4gdm9pZCwgZGF0YTogc3RyaW5nKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgIGVsZW0udHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG4gICAgZWxlbS5pbm5lckhUTUwgPSBgKCR7c291cmNlfSkoJHtkYXRhfSlgO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydzZXR0aW5ncyddLCByZXMgPT4ge1xuICAgIGluamVjdFNjcmlwdChmdW5jdGlvbiAoc2V0dGluZ3M6IGFueSkge1xuICAgICAgICBjb25zdCBoaWRkZW5faWRzID0gc2V0dGluZ3MuaGlkZGVuX2lkcyA/IHNldHRpbmdzLmhpZGRlbl9pZHMuc3BsaXQoXCIsXCIpLm1hcChzID0+IHMudHJpbSgpKSA6IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJpbmRSZXNwb25zZShyZXF1ZXN0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VUZXh0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXJNZXNzYWdlcyhtZXNzYWdlcykge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGhpZGRlbiBib3RzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLmZpbHRlcihtID0+IGhpZGRlbl9pZHMuaW5kZXhPZihtLmJvdF9pZCkgPT09IC0xICYmIGhpZGRlbl9pZHMuaW5kZXhPZihtLnVzZXIpID09PSAtMSk7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSByZWFjdGlvbnMgYW5kIGZpbGVzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLm1hcChtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIG0udGV4dCA9IG0udGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5yZWFjdGlvbnMgJiYgc2V0dGluZ3Mub25seV9teV9yZWFjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0udXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbS5yZWFjdGlvbnMgPSBtLnJlYWN0aW9ucy5maWx0ZXIociA9PiByLnVzZXJzLmluZGV4T2YobXlfaWQpICE9PSAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLnJlYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLnJlYWN0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5maWxlcyAmJiBzZXR0aW5ncy5oaWRlX2dkcml2ZV9wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIG0uZmlsZXMgPSBtLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbS5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLmF0dGFjaG1lbnRzICYmIHNldHRpbmdzLmhpZGVfdXJsX3ByZXZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG0uYXR0YWNobWVudHMgPSBtLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcocmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgaWYgKGRhdGEub2spIHtcbiAgICAgICAgICAgICAgICBteV9pZCA9IGRhdGEuc2VsZi5pZDtcbiAgICAgICAgICAgICAgICBkYXRhLmhpc3RvcnkubWVzc2FnZXMgPSBmaWx0ZXJNZXNzYWdlcyhkYXRhLmhpc3RvcnkubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9ucyhyZXF1ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbXlfaWQgPSAnJztcbiAgICAgICAgdmFyIHByb3hpZWQgPSAod2luZG93IGFzIGFueSkuWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW47XG4gICAgICAgIGNvbnN0IHJlID0gLzxAKFtePl0rKT4vZztcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLlhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1ldGhvZCwgcGF0aCwgYXN5bmMpIHtcbiAgICAgICAgICAgIGxldCBvbGRMaXN0ZW5lciA9IGUgPT4geyB9O1xuICAgICAgICAgICAgaWYgKHRoaXMub25yZWFkeXN0YXRlY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIgPSB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGF0aCA9PSAnL2FwaS9jb252ZXJzYXRpb25zLnZpZXcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRoLm1hdGNoKC9cXC9hcGlcXC9jb252ZXJzYXRpb25zXFwuaGlzdG9yeS8pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9ucyh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvbGRMaXN0ZW5lcihlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGguc3RhcnRzV2l0aCgnL2FwaS9jaGF0LnBvc3RNZXNzYWdlJykgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2NoYXQudXBkYXRlJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRTZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUZXh0ID0gZS5nZXQoJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVGV4dCA9IG9yaWdpbmFsVGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCgoW15cXCldKylcXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGguc3RhcnRzV2l0aCgnL2FwaS9jaGF0LnVwZGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnNldCgncGFyc2UnLCAnbm9uZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhhbmdvdXRfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3OiBhbnkgPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbE1lc3NhZ2UgPSBmaW5hbFRleHQudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZHMgPSBbdy5UUy5tb2RlbC51c2VyLmlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxNZXNzYWdlLmluZGV4T2YoXCJoYW5nb3V0IFwiKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gZmluYWxUZXh0LnN1YnN0cmluZyg4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXJsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG1hdGNoID0gcmUuZXhlYyhuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VySWRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VySWRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlck5hbWVzID0gdy5UUy5tb2RlbC5tZW1iZXJzLmZpbHRlcihtID0+IHVzZXJJZHMuaW5kZXhPZihtLmlkKSAhPSAtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChtID0+IG0ucHJvZmlsZS5kaXNwbGF5X25hbWVfbm9ybWFsaXplZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJOYW1lcy5zb3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IHVzZXJOYW1lcy5qb2luKCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCB1c2UgdGhlIHRleHQgc2VwYXJhdGVkIGJ5IGh5cGhlbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gbmFtZS5yZXBsYWNlKCcgJywgJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSB1cmwudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtekEtWjAtOS1dL2csIFwiLVwiKS5yZXBsYWNlKC8tKy9nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxUZXh0ID0gYGhhbmdvdXQgJHtuYW1lfTogJHtzZXR0aW5ncy5oYW5nb3V0X3VybC5yZXBsYWNlKCckbmFtZSQnLCB1cmwpfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5nZXQoJ3JlcGx5X2Jyb2FkY2FzdCcpID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3JlcGx5X2Jyb2FkY2FzdF90b2dnbGUnKV0uZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIGFueSkuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGUuc2V0KCd0ZXh0JywgZmluYWxUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgb2xkU2VuZChlKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJveGllZC5hcHBseSh0aGlzLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHByb3h5IHRoZSB3aW5kb3cuV2ViU29ja2V0IG9iamVjdFxuICAgICAgICB2YXIgV2ViU29ja2V0UHJveHkgPSBuZXcgUHJveHkoKHdpbmRvdyBhcyBhbnkpLldlYlNvY2tldCwge1xuICAgICAgICAgICAgY29uc3RydWN0OiBmdW5jdGlvbiAodGFyZ2V0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYmluZFdlYlNvY2tldERhdGEoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuX19kZWZpbmVHZXR0ZXJfXyhcImRhdGFcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBXZWJTb2NrZXQgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyB0YXJnZXQoLi4uYXJncyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlSGFuZGxlciA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJyZWFjdGlvbl9hZGRlZFwiICYmIHNldHRpbmdzLm9ubHlfbXlfcmVhY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS51c2VyICE9IG15X2lkICYmIGRhdGEuaXRlbV91c2VyICE9IG15X2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEudHlwZSA9PT0gXCJtZXNzYWdlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgaWdub3JlZCB1c2Vyc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpZGRlbl9pZHMuaW5kZXhPZihkYXRhLnVzZXIpICE9PSAtMSB8fCBoaWRkZW5faWRzLmluZGV4T2YoZGF0YS5ib3RfaWQpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGlkIHNvbWVib2R5IHNlbmQgYSBtYXJrZG93biBsaW5rPyBwYXJzZSBpdCFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnRleHQgPSBkYXRhLnRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoPChbXlxcKV0rKT5cXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiBpdCBjb21lcyB3aXRoIGFuIGF0dGFjaG1lbnQsIGl0J3MgaW4gaGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEubWVzc2FnZSAmJiBkYXRhLm1lc3NhZ2UudGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS50ZXh0ID0gZGF0YS5tZXNzYWdlLnRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoPChbXlxcKV0rKT5cXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSBnZHJpdmUgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuaGlkZV9nZHJpdmVfcHJldmlldyAmJiBkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlLmZpbGVzID0gZGF0YS5tZXNzYWdlLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLm1lc3NhZ2UuZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLm1lc3NhZ2UuZmlsZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIHByZXZpZXcgdXJscyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5oaWRlX3VybF9wcmV2aWV3cyAmJiBkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzID0gZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEubWVzc2FnZS5hdHRhY2htZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnVucmVhZF9vbl90aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHcgPSB3aW5kb3cgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNoYW5uZWwgPT0gdy5DdXJyZW50Q2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBiaXQgd2VpcmQuLi4gdGhleSBhbHdheXMgc2VuZCBhIG1lc3NhZ2UsIGV2ZW4gaWYgaXQncyBhIG1lc3NhZ2UgaW5zaWRlIGEgdGhyZWFkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZXkgdGhlbiBzZW5kIHRoZSBtZXNzYWdlX3JlcGllZCBldmVudCwgYW5kIGlmIGl0J3MgYSB0aHJlYWRlZCBtZXNzYWdlIGFsc28gc2VudCB0byB0aGUgY2hhbm5lbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVuIHRoZXkgc2VuZCBhIG1lc3NhZ2VfY2hhbmdlZCBldmVudCB3aXRob3V0IGFuIGVkaXRlZCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGF0IGFyZSB5b3Ugc2F5aW5nPyB0aGF0IHRoaXMgaXMgYSBoYWNrPyB5ZXMsIHRoZSB3aG9sZSB0aGluZyBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEuc3VidHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQncyBhIG1lc3NhZ2UuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS50aHJlYWRfdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIG5vdCBpbiBhIHRocmVhZCFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3LkN1cnJlbnRVbnJlYWQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnN1YnR5cGUgPT09ICdtZXNzYWdlX2NoYW5nZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtZXNzYWdlX2NoYW5nZWQsIHdlIHN0aWxsIGRvbid0IGtub3cgbXVjaCBhYm91dCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLm1lc3NhZ2UuZWRpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiBhIHRocmVhZGVkIG1lc3NhZ2UgaXMgc2VudCB0byB0aGUgY2hhdCwgdGhlcmUncyBubyBlZGl0ZWQgcHJvcGVydHkuIEFyZSB0aGVyZSBhbnlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBpbnN0YW5jZXMgd2hlbiB0aGlzIGhhcHBlbnM/IEkgaGF2ZSBubyBmcmVha2luZyBpZGVhIDopXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdy5DdXJyZW50VW5yZWFkKytcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aXRsZSA9IGRvY3VtZW50LnRpdGxlLnJlcGxhY2UoL14oKFtcXCohXSApfChcXChbMC05XStcXCkgKSkqLywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAody5DdXJyZW50VW5yZWFkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC50aXRsZSA9IGAoJHt3LkN1cnJlbnRVbnJlYWR9KSAke3RpdGxlfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYmluZFdlYlNvY2tldERhdGEoZXZlbnQsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtZXNzYWdlSGFuZGxlcik7XG5cbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gdGhlIFdlYlNvY2tldCBpbnN0YW5jZVxuICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcmVwbGFjZSB0aGUgbmF0aXZlIFdlYlNvY2tldCB3aXRoIHRoZSBwcm94eVxuICAgICAgICAod2luZG93IGFzIGFueSkuV2ViU29ja2V0ID0gV2ViU29ja2V0UHJveHk7XG5cbiAgICAgICAgaWYgKHNldHRpbmdzLnRocmVhZHNfb25fY2hhbm5lbCkge1xuICAgICAgICAgICAgLy8gYWx3YXlzIHJlcGx5IHRvIHRoZSBjaGFubmVsLi4uIFRPRE86IERvbid0IHVzZSBET01Ob2RlSW5zZXJ0ZWRcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTU5vZGVJbnNlcnRlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2wgPSAoZS50YXJnZXQgYXMgYW55KS5jbGFzc0xpc3Q7XG4gICAgICAgICAgICAgICAgaWYgKGNsICYmIGNsLmNvbnRhaW5zKCdyZXBseV9jb250YWluZXJfaW5mbycpKSB7XG4gICAgICAgICAgICAgICAgICAgIFsuLi5kb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXBseV9icm9hZGNhc3RfdG9nZ2xlJyldLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIGFueSkuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNzcyA9ICcnO1xuICAgICAgICBpZiAoc2V0dGluZ3MuaGlkZV9zdGF0dXNfZW1vamkpIHtcbiAgICAgICAgICAgIGNzcyArPSBgXG4uYy1jdXN0b21fc3RhdHVzLCAubWVzc2FnZV9jdXJyZW50X3N0YXR1cyB7XG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xufWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLnJlYWN0aW9uc19vbl90aGVfcmlnaHQpIHtcbiAgICAgICAgICAgIGNzcyArPSBgXG4uYy1yZWFjdGlvbl9iYXIge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICBib3R0b206IDVweDtcbiAgICByaWdodDogMS4yNXJlbTtcbn1cbi5jLW1lc3NhZ2VfX2FjdGlvbnMtLW1lbnUtc2hvd2luZywgLmMtbWVzc2FnZV9fYWN0aW9ucyB7XG4gICAgdG9wOiB1bnNldCAhaW1wb3J0YW50O1xuICAgIGJvdHRvbTogMjhweDtcbn1cbkBtZWRpYSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDExMDBweCkge1xuICAgIC5jLXJlYWN0aW9uX2JhciB7XG4gICAgICAgIGRpc3BsYXk6IG5vbmU7XG4gICAgfVxufVxuLmMtcmVhY3Rpb25fYWRkLCAuYy1yZWFjdGlvbl9hZGQ6aG92ZXIge1xuICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbn1cbmA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3NzKSB7XG4gICAgICAgICAgICB2YXIgc2hlZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICAgICAgc2hlZXQudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICAgICAgICAod2luZG93IGFzIGFueSkuY3VzdG9tU2hlZXQgPSBzaGVldDtcbiAgICAgICAgICAgIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0pLmFwcGVuZENoaWxkKHNoZWV0KTtcbiAgICAgICAgICAgIHNoZWV0LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRml4IGVkaXQgb24gYSBtZXNzYWdlIHdpdGggYSBsaW5rXG4gICAgICAgIHZhciBpbnRlcnZhbE1lc3NhZ2VFZGl0ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdzogYW55ID0gd2luZG93O1xuICAgICAgICAgICAgaWYgKHcuVFMgJiYgdy5UUy5mb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsTWVzc2FnZUVkaXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IG9sZCA9IHcuVFMuZm9ybWF0LmZvcm1hdFdpdGhPcHRpb25zO1xuICAgICAgICAgICAgdy5UUy5mb3JtYXQuZm9ybWF0V2l0aE9wdGlvbnMgPSAodCwgbiwgcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyICYmIHIuZm9yX2VkaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdCA9IHQucmVwbGFjZSgvPChbXjw+XFx8XSspXFx8KFtePD5dKyk+L2csIChfLCB1cmwsIHRpdGxlKSA9PiBgWyR7dGl0bGV9XSgke3VybH0pYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvbGQodCwgbiwgcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG5cbiAgICAgICAgLy8gSSBoYWQgdG9cbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldE5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1lc3NhZ2VzX2hlYWRlclwiKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXROb2RlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBvYnNlcnZlck9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoZSwgb2JzZXJ2ZXIpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFubmVsX3RvcGljX3RleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAmJiB0ZXh0LmlubmVyVGV4dCA9PT0gJ05vdCB0aGUgU2xhY2sgY29tcGxhaW50IHJvb20uJykge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0LmlubmVySFRNTCA9ICc8c3RyaWtlPk5vdDwvc3RyaWtlPiB0aGUgU2xhY2sgPHN0cmlrZT5jb21wbGFpbnQ8L3N0cmlrZT4gPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkOyBmb250LXdlaWdodDogYm9sZFwiPm1vZGRpbmc8L3NwYW4+IHJvb20uJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0Tm9kZSwgb2JzZXJ2ZXJPcHRpb25zKTtcbiAgICAgICAgfSwgMjAwKTtcblxuICAgICAgICBpZiAoc2V0dGluZ3MudW5yZWFkX29uX3RpdGxlKSB7XG4gICAgICAgICAgICAvLyBBdm9pZCBhZGRpbmcgKiBvciAhIG9uIHRoZSB0aXRsZVxuICAgICAgICAgICAgdmFyIHRhcmdldE5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd0aXRsZScpXG4gICAgICAgICAgICB2YXIgY29uZmlnID0geyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQudGl0bGUuc3RhcnRzV2l0aCgnKicpIHx8IGRvY3VtZW50LnRpdGxlLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY3VtZW50LnRpdGxlLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXROb2RlLCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVhY3QgbW9ua2V5IHBhdGNoXG4gICAgICAgIHZhciByZWFjdEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdyA9IHdpbmRvdyBhcyBhbnk7XG4gICAgICAgICAgICBpZiAody5SZWFjdCAmJiB3LlJlYWN0LmNyZWF0ZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlYWN0SW50ZXJ2YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDcmVhdGVFbGVtZW50ID0gdy5SZWFjdC5jcmVhdGVFbGVtZW50O1xuXG4gICAgICAgICAgICAvLyBEZWZpbmUgYSBuZXcgZnVuY3Rpb25cbiAgICAgICAgICAgIHcuUmVhY3QuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgb3VyIGFyZ3VtZW50cyBhcyBhbiBhcnJheVxuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBvcmlnaW5hbENyZWF0ZUVsZW1lbnQuYXBwbHkody5SZWFjdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBhcmdzWzBdLmRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wcyA9IHJlc3BvbnNlLnByb3BzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MudW5yZWFkX29uX3RpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgY3VycmVudCBjaGFubmVsIGlkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgPT09ICdNZXNzYWdlUGFuZScgJiYgcHJvcHMuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdy5DdXJyZW50Q2hhbm5lbElkID0gcHJvcHMuY2hhbm5lbElkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgd2UgdW5zZXQgdGhlIHRpdGxlIG1hcmtlciB3aGVuIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSA9PT0gJ1VucmVhZEJhbm5lcicgJiYgcHJvcHMuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm9wcy5oYXNVbnJlYWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudFVucmVhZCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jdW1lbnQudGl0bGUucmVwbGFjZSgvXigoW1xcKiFdICl8KFxcKFswLTldK1xcKSApKSovLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSwgMTAwKTtcblxuICAgIH0sIHJlcy5zZXR0aW5ncyB8fCAne30nKTtcbn0pOyJdLCJzb3VyY2VSb290IjoiIn0=