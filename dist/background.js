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
        const re = /@([^@>]+)>/g;
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
            else if (path.startsWith('/api/chat.postMessage')) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const originalText = e.get('text');
                    let finalText = originalText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    if (settings.hangout_url) {
                        const w = window;
                        var lMessage = finalText.toLowerCase();
                        var userNames = [w.TS.model.user.profile.display_name];
                        var match;
                        if (lMessage.indexOf("hangout ") === 0) {
                            var name = finalText.substring(8);
                            var url;
                            while (match = re.exec(name)) {
                                userNames.push(match[1]);
                            }
                            if (userNames.length > 1) {
                                userNames = userNames.map(u => u.normalize('NFD').replace(/[\u0300-\u036f]/g, ""));
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
                                w.CurrentUnread++;
                                let title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                                setTimeout(() => document.title = `(${w.CurrentUnread}) ${title}`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2JhY2tncm91bmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0RBQTBDLGdDQUFnQztBQUMxRTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGdFQUF3RCxrQkFBa0I7QUFDMUU7QUFDQSx5REFBaUQsY0FBYztBQUMvRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQXlDLGlDQUFpQztBQUMxRSx3SEFBZ0gsbUJBQW1CLEVBQUU7QUFDckk7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7O0FBR0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDbEZBLFNBQVMsWUFBWSxDQUFDLE1BQThCLEVBQUUsSUFBWTtJQUM5RCxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQztJQUN4QyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDeEMsWUFBWSxDQUFDLFVBQVUsUUFBYTtRQUNoQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRWhHLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxRQUFRO1lBQ25DLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUU7Z0JBQ3JDLE9BQU8sUUFBUTtZQUNuQixDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQ2pDLE9BQU8sUUFBUTtZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxTQUFTLGNBQWMsQ0FBQyxRQUFRO1lBQzVCLHFCQUFxQjtZQUNyQixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUcsNkJBQTZCO1lBQzdCLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUU7b0JBQ1IsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO2lCQUNoRztnQkFDRCxJQUFJLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLGlCQUFpQixFQUFFO29CQUMzQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxFQUFFO3dCQUNqQixDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDeEU7b0JBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO3dCQUNyQixPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7cUJBQ3RCO2lCQUNKO2dCQUNELElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsbUJBQW1CLEVBQUU7b0JBQ3pDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7d0JBQ2pCLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztxQkFDbEI7aUJBQ0o7Z0JBQ0QsSUFBSSxDQUFDLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRTtvQkFDN0MsQ0FBQyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN2RCxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRTt3QkFDaEIsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDO3FCQUN4QjtpQkFDSjtnQkFDRCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxRQUFRLENBQUM7UUFDcEIsQ0FBQztRQUVELFNBQVMsd0JBQXdCLENBQUMsT0FBTztZQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5QyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUQsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDL0M7UUFDTCxDQUFDO1FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFPO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTlDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDVCxJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1FBQ0wsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNmLElBQUksT0FBTyxHQUFJLE1BQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUM1RCxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUM7UUFDeEIsTUFBYyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFVBQVUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLO1lBQ3pFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUN6QixXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNwRDtZQUVELElBQUksSUFBSSxJQUFJLHlCQUF5QixFQUFFO2dCQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQzFCLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLEVBQUU7d0JBQ3RCLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNsQztvQkFDRCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLENBQUM7YUFDSjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsRUFBRTtnQkFDcEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUMxQixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUFFO3dCQUN0QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDOUI7b0JBQ0QsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2FBQ0o7aUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQUU7Z0JBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztvQkFDbkIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkMsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUV4RyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7d0JBQ3RCLE1BQU0sQ0FBQyxHQUFRLE1BQU0sQ0FBQzt3QkFDdEIsSUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUN2QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQ3ZELElBQUksS0FBSyxDQUFDO3dCQUVWLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7NEJBQ3BDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xDLElBQUksR0FBRyxDQUFDOzRCQUVSLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0NBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQzVCOzRCQUVELElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0NBQ3RCLFNBQVMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQ0FDbkYsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO2dDQUNqQixHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs2QkFDN0I7aUNBQU07Z0NBQ0gseUNBQXlDO2dDQUN6QyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7NkJBQ2hDOzRCQUVELEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQzNFLFNBQVMsR0FBRyxXQUFXLElBQUksS0FBSyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQzt5QkFDakY7cUJBQ0o7b0JBRUQsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUssTUFBTSxFQUFFO3dCQUNyQyxDQUFDLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7NEJBQ3ZFLEVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO3dCQUMvQixDQUFDLENBQUMsQ0FBQztxQkFDTjtvQkFFRCxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDekIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNmLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEI7WUFDRCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDO1FBRUYsb0NBQW9DO1FBQ3BDLElBQUksY0FBYyxHQUFHLElBQUksS0FBSyxDQUFFLE1BQWMsQ0FBQyxTQUFTLEVBQUU7WUFDdEQsU0FBUyxFQUFFLFVBQVUsTUFBTSxFQUFFLElBQUk7Z0JBQzdCLFNBQVMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUk7b0JBQ2xDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7d0JBQzNCLE9BQU8sSUFBSSxDQUFDO29CQUNoQixDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUVELDRCQUE0QjtnQkFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFFckMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDN0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRWxDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsaUJBQWlCLEVBQUU7d0JBQzlELElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLEVBQUU7NEJBQy9DLElBQUksR0FBRyxFQUFFLENBQUM7eUJBQ2I7cUJBQ0o7eUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTt3QkFDaEMscUJBQXFCO3dCQUNyQixJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFOzRCQUNoRixJQUFJLEdBQUcsRUFBRSxDQUFDO3lCQUNiO3dCQUVELCtDQUErQzt3QkFDL0MsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFOzRCQUNYLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQzt5QkFDdEc7d0JBRUQsaURBQWlEO3dCQUNqRCxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7NEJBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO3lCQUN0SDt3QkFFRCx3QkFBd0I7d0JBQ3hCLElBQUksUUFBUSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7NEJBQ3BFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssUUFBUSxDQUFDLENBQUM7NEJBQ2xGLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0NBQzVCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7NkJBQzdCO3lCQUNKO3dCQUVELDhCQUE4Qjt3QkFDOUIsSUFBSSxRQUFRLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTs0QkFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtnQ0FDM0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQzs2QkFDbkM7eUJBQ0o7d0JBRUQsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFOzRCQUMxQixNQUFNLENBQUMsR0FBRyxNQUFhLENBQUM7NEJBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEVBQUU7Z0NBQ3BDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQ0FDbEIsSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ3JFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLGFBQWEsS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUFDOzZCQUN0RTt5QkFDSjtxQkFDSjtvQkFFRCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDLENBQUM7Z0JBQ0YsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFFckQsZ0NBQWdDO2dCQUNoQyxPQUFPLFFBQVEsQ0FBQztZQUNwQixDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzdDLE1BQWMsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDO1FBRTNDLElBQUksUUFBUSxDQUFDLGtCQUFrQixFQUFFO1lBQzdCLGlFQUFpRTtZQUNqRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDO2dCQUNwRCxNQUFNLEVBQUUsR0FBSSxDQUFDLENBQUMsTUFBYyxDQUFDLFNBQVMsQ0FBQztnQkFDdkMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO29CQUMzQyxDQUFDLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ3ZFLEVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO29CQUMvQixDQUFDLENBQUMsQ0FBQztpQkFDTjtZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRTtZQUM1QixHQUFHLElBQUk7OztFQUdqQixDQUFDO1NBQ007UUFDRCxJQUFJLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRTtZQUNqQyxHQUFHLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtCbEIsQ0FBQztTQUNPO1FBRUQsSUFBSSxHQUFHLEVBQUU7WUFDTCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLEtBQUssQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQ3ZCLE1BQWMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0UsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxvQ0FBb0M7UUFDcEMsSUFBSSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFRLE1BQU0sQ0FBQztZQUN0QixJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JCLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNO2dCQUNILE9BQU07YUFDVDtZQUVELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO1lBQ3hDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDakIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztpQkFDckY7Z0JBQ0QsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QixDQUFDO1FBQ0wsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsV0FBVztRQUNYLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzVELElBQUksVUFBVSxFQUFFO2dCQUNaLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUMzQjtpQkFBTTtnQkFDSCxPQUFPO2FBQ1Y7WUFDRCxJQUFJLGVBQWUsR0FBRztnQkFDbEIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLE9BQU8sRUFBRSxJQUFJO2FBQ2hCO1lBRUQsSUFBSSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLCtCQUErQixFQUFFO29CQUM1RCxJQUFJLENBQUMsU0FBUyxHQUFHLDRIQUE0SCxDQUFDO2lCQUNqSjtZQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEQsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFO1lBQzFCLG1DQUFtQztZQUNuQyxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNoRCxJQUFJLE1BQU0sR0FBRyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDbEUsSUFBSSxRQUFRLEdBQUc7Z0JBQ1gsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDbEUsUUFBUSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDaEQ7WUFDTCxDQUFDLENBQUM7WUFDRixJQUFJLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3hDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDakMsTUFBTSxDQUFDLEdBQUcsTUFBYSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDbEMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNILE9BQU87YUFDVjtZQUVELDhCQUE4QjtZQUM5QixNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBRXBELHdCQUF3QjtZQUN4QixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRztnQkFDcEIsZ0NBQWdDO2dCQUNoQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRW5ELE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUN4QyxJQUFJLFdBQVcsRUFBRTtvQkFDYixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUM3QixJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7d0JBQzFCLCtCQUErQjt3QkFDL0IsSUFBSSxXQUFXLEtBQUssYUFBYSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUU7NEJBQ2xELENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO3lCQUN4Qzt3QkFFRCxzREFBc0Q7d0JBQ3RELElBQUksV0FBVyxLQUFLLGNBQWMsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFOzRCQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRTtnQ0FDbkIsQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0NBQ3BCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7NkJBQzdFO3lCQUNKO3FCQUNKO2lCQUNKO2dCQUVELE9BQU8sUUFBUSxDQUFDO1lBQ3BCLENBQUMsQ0FBQztRQUNOLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVaLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImJhY2tncm91bmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL3NyYy9iYWNrZ3JvdW5kLnRzXCIpO1xuIiwiZnVuY3Rpb24gaW5qZWN0U2NyaXB0KHNvdXJjZTogKGRhdGE6IHN0cmluZykgPT4gdm9pZCwgZGF0YTogc3RyaW5nKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgIGVsZW0udHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG4gICAgZWxlbS5pbm5lckhUTUwgPSBgKCR7c291cmNlfSkoJHtkYXRhfSlgO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydzZXR0aW5ncyddLCByZXMgPT4ge1xuICAgIGluamVjdFNjcmlwdChmdW5jdGlvbiAoc2V0dGluZ3M6IGFueSkge1xuICAgICAgICBjb25zdCBoaWRkZW5faWRzID0gc2V0dGluZ3MuaGlkZGVuX2lkcyA/IHNldHRpbmdzLmhpZGRlbl9pZHMuc3BsaXQoXCIsXCIpLm1hcChzID0+IHMudHJpbSgpKSA6IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJpbmRSZXNwb25zZShyZXF1ZXN0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VUZXh0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXJNZXNzYWdlcyhtZXNzYWdlcykge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGhpZGRlbiBib3RzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLmZpbHRlcihtID0+IGhpZGRlbl9pZHMuaW5kZXhPZihtLmJvdF9pZCkgPT09IC0xICYmIGhpZGRlbl9pZHMuaW5kZXhPZihtLnVzZXIpID09PSAtMSk7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSByZWFjdGlvbnMgYW5kIGZpbGVzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLm1hcChtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIG0udGV4dCA9IG0udGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5yZWFjdGlvbnMgJiYgc2V0dGluZ3Mub25seV9teV9yZWFjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0udXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbS5yZWFjdGlvbnMgPSBtLnJlYWN0aW9ucy5maWx0ZXIociA9PiByLnVzZXJzLmluZGV4T2YobXlfaWQpICE9PSAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLnJlYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLnJlYWN0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5maWxlcyAmJiBzZXR0aW5ncy5oaWRlX2dkcml2ZV9wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIG0uZmlsZXMgPSBtLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbS5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLmF0dGFjaG1lbnRzICYmIHNldHRpbmdzLmhpZGVfdXJsX3ByZXZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG0uYXR0YWNobWVudHMgPSBtLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcocmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgaWYgKGRhdGEub2spIHtcbiAgICAgICAgICAgICAgICBteV9pZCA9IGRhdGEuc2VsZi5pZDtcbiAgICAgICAgICAgICAgICBkYXRhLmhpc3RvcnkubWVzc2FnZXMgPSBmaWx0ZXJNZXNzYWdlcyhkYXRhLmhpc3RvcnkubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9ucyhyZXF1ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbXlfaWQgPSAnJztcbiAgICAgICAgdmFyIHByb3hpZWQgPSAod2luZG93IGFzIGFueSkuWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW47XG4gICAgICAgIGNvbnN0IHJlID0gL0AoW15APl0rKT4vZztcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLlhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1ldGhvZCwgcGF0aCwgYXN5bmMpIHtcbiAgICAgICAgICAgIGxldCBvbGRMaXN0ZW5lciA9IGUgPT4geyB9O1xuICAgICAgICAgICAgaWYgKHRoaXMub25yZWFkeXN0YXRlY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIgPSB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGF0aCA9PSAnL2FwaS9jb252ZXJzYXRpb25zLnZpZXcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRoLm1hdGNoKC9cXC9hcGlcXC9jb252ZXJzYXRpb25zXFwuaGlzdG9yeS8pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9ucyh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvbGRMaXN0ZW5lcihlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGguc3RhcnRzV2l0aCgnL2FwaS9jaGF0LnBvc3RNZXNzYWdlJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRTZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUZXh0ID0gZS5nZXQoJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVGV4dCA9IG9yaWdpbmFsVGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCgoW15cXCldKylcXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuaGFuZ291dF91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHc6IGFueSA9IHdpbmRvdztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsTWVzc2FnZSA9IGZpbmFsVGV4dC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJOYW1lcyA9IFt3LlRTLm1vZGVsLnVzZXIucHJvZmlsZS5kaXNwbGF5X25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobE1lc3NhZ2UuaW5kZXhPZihcImhhbmdvdXQgXCIpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBmaW5hbFRleHQuc3Vic3RyaW5nKDgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1cmw7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobWF0Y2ggPSByZS5leGVjKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJOYW1lcy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlck5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlck5hbWVzID0gdXNlck5hbWVzLm1hcCh1ID0+IHUubm9ybWFsaXplKCdORkQnKS5yZXBsYWNlKC9bXFx1MDMwMC1cXHUwMzZmXS9nLCBcIlwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJOYW1lcy5zb3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IHVzZXJOYW1lcy5qb2luKCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCB1c2UgdGhlIHRleHQgc2VwYXJhdGVkIGJ5IGh5cGhlbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gbmFtZS5yZXBsYWNlKCcgJywgJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSB1cmwudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtekEtWjAtOS1dL2csIFwiLVwiKS5yZXBsYWNlKC8tKy9nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxUZXh0ID0gYGhhbmdvdXQgJHtuYW1lfTogJHtzZXR0aW5ncy5oYW5nb3V0X3VybC5yZXBsYWNlKCckbmFtZSQnLCB1cmwpfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5nZXQoJ3JlcGx5X2Jyb2FkY2FzdCcpID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3JlcGx5X2Jyb2FkY2FzdF90b2dnbGUnKV0uZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIGFueSkuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGUuc2V0KCd0ZXh0JywgZmluYWxUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgb2xkU2VuZChlKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJveGllZC5hcHBseSh0aGlzLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHByb3h5IHRoZSB3aW5kb3cuV2ViU29ja2V0IG9iamVjdFxuICAgICAgICB2YXIgV2ViU29ja2V0UHJveHkgPSBuZXcgUHJveHkoKHdpbmRvdyBhcyBhbnkpLldlYlNvY2tldCwge1xuICAgICAgICAgICAgY29uc3RydWN0OiBmdW5jdGlvbiAodGFyZ2V0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYmluZFdlYlNvY2tldERhdGEoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuX19kZWZpbmVHZXR0ZXJfXyhcImRhdGFcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBXZWJTb2NrZXQgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyB0YXJnZXQoLi4uYXJncyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlSGFuZGxlciA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJyZWFjdGlvbl9hZGRlZFwiICYmIHNldHRpbmdzLm9ubHlfbXlfcmVhY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS51c2VyICE9IG15X2lkICYmIGRhdGEuaXRlbV91c2VyICE9IG15X2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEudHlwZSA9PT0gXCJtZXNzYWdlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgaWdub3JlZCB1c2Vyc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpZGRlbl9pZHMuaW5kZXhPZihkYXRhLnVzZXIpICE9PSAtMSB8fCBoaWRkZW5faWRzLmluZGV4T2YoZGF0YS5ib3RfaWQpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGlkIHNvbWVib2R5IHNlbmQgYSBtYXJrZG93biBsaW5rPyBwYXJzZSBpdCFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnRleHQgPSBkYXRhLnRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoPChbXlxcKV0rKT5cXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiBpdCBjb21lcyB3aXRoIGFuIGF0dGFjaG1lbnQsIGl0J3MgaW4gaGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEubWVzc2FnZSAmJiBkYXRhLm1lc3NhZ2UudGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS50ZXh0ID0gZGF0YS5tZXNzYWdlLnRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoPChbXlxcKV0rKT5cXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSBnZHJpdmUgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuaGlkZV9nZHJpdmVfcHJldmlldyAmJiBkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlLmZpbGVzID0gZGF0YS5tZXNzYWdlLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLm1lc3NhZ2UuZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLm1lc3NhZ2UuZmlsZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIHByZXZpZXcgdXJscyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5oaWRlX3VybF9wcmV2aWV3cyAmJiBkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzID0gZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEubWVzc2FnZS5hdHRhY2htZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnVucmVhZF9vbl90aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHcgPSB3aW5kb3cgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNoYW5uZWwgPT0gdy5DdXJyZW50Q2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudFVucmVhZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGl0bGUgPSBkb2N1bWVudC50aXRsZS5yZXBsYWNlKC9eKChbXFwqIV0gKXwoXFwoWzAtOV0rXFwpICkpKi8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBkb2N1bWVudC50aXRsZSA9IGAoJHt3LkN1cnJlbnRVbnJlYWR9KSAke3RpdGxlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJpbmRXZWJTb2NrZXREYXRhKGV2ZW50LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgbWVzc2FnZUhhbmRsZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSBXZWJTb2NrZXQgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHJlcGxhY2UgdGhlIG5hdGl2ZSBXZWJTb2NrZXQgd2l0aCB0aGUgcHJveHlcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLldlYlNvY2tldCA9IFdlYlNvY2tldFByb3h5O1xuXG4gICAgICAgIGlmIChzZXR0aW5ncy50aHJlYWRzX29uX2NoYW5uZWwpIHtcbiAgICAgICAgICAgIC8vIGFsd2F5cyByZXBseSB0byB0aGUgY2hhbm5lbC4uLiBUT0RPOiBEb24ndCB1c2UgRE9NTm9kZUluc2VydGVkXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Ob2RlSW5zZXJ0ZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsID0gKGUudGFyZ2V0IGFzIGFueSkuY2xhc3NMaXN0O1xuICAgICAgICAgICAgICAgIGlmIChjbCAmJiBjbC5jb250YWlucygncmVwbHlfY29udGFpbmVyX2luZm8nKSkge1xuICAgICAgICAgICAgICAgICAgICBbLi4uZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncmVwbHlfYnJvYWRjYXN0X3RvZ2dsZScpXS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBhbnkpLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjc3MgPSAnJztcbiAgICAgICAgaWYgKHNldHRpbmdzLmhpZGVfc3RhdHVzX2Vtb2ppKSB7XG4gICAgICAgICAgICBjc3MgKz0gYFxuLmMtY3VzdG9tX3N0YXR1cywgLm1lc3NhZ2VfY3VycmVudF9zdGF0dXMge1xuICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbn1gO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5yZWFjdGlvbnNfb25fdGhlX3JpZ2h0KSB7XG4gICAgICAgICAgICBjc3MgKz0gYFxuLmMtcmVhY3Rpb25fYmFyIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgYm90dG9tOiA1cHg7XG4gICAgcmlnaHQ6IDEuMjVyZW07XG59XG4uYy1tZXNzYWdlX19hY3Rpb25zLS1tZW51LXNob3dpbmcsIC5jLW1lc3NhZ2VfX2FjdGlvbnMge1xuICAgIHRvcDogdW5zZXQgIWltcG9ydGFudDtcbiAgICBib3R0b206IDI4cHg7XG59XG5AbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMTAwcHgpIHtcbiAgICAuYy1yZWFjdGlvbl9iYXIge1xuICAgICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbn1cbi5jLXJlYWN0aW9uX2FkZCwgLmMtcmVhY3Rpb25fYWRkOmhvdmVyIHtcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG59XG5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgdmFyIHNoZWV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgICAgIHNoZWV0LnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgICAgICAgKHdpbmRvdyBhcyBhbnkpLmN1c3RvbVNoZWV0ID0gc2hlZXQ7XG4gICAgICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzaGVldCk7XG4gICAgICAgICAgICBzaGVldC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpeCBlZGl0IG9uIGEgbWVzc2FnZSB3aXRoIGEgbGlua1xuICAgICAgICB2YXIgaW50ZXJ2YWxNZXNzYWdlRWRpdCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHc6IGFueSA9IHdpbmRvdztcbiAgICAgICAgICAgIGlmICh3LlRTICYmIHcuVFMuZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbE1lc3NhZ2VFZGl0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBvbGQgPSB3LlRTLmZvcm1hdC5mb3JtYXRXaXRoT3B0aW9ucztcbiAgICAgICAgICAgIHcuVFMuZm9ybWF0LmZvcm1hdFdpdGhPcHRpb25zID0gKHQsIG4sIHIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAociAmJiByLmZvcl9lZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHQgPSB0LnJlcGxhY2UoLzwoW148PlxcfF0rKVxcfChbXjw+XSspPi9nLCAoXywgdXJsLCB0aXRsZSkgPT4gYFske3RpdGxlfV0oJHt1cmx9KWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb2xkKHQsIG4sIHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAyMDApO1xuXG4gICAgICAgIC8vIEkgaGFkIHRvXG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHZhciB0YXJnZXROb2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tZXNzYWdlc19oZWFkZXJcIik7XG4gICAgICAgICAgICBpZiAodGFyZ2V0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgb2JzZXJ2ZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKGUsIG9ic2VydmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhbm5lbF90b3BpY190ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKHRleHQgJiYgdGV4dC5pbm5lclRleHQgPT09ICdOb3QgdGhlIFNsYWNrIGNvbXBsYWludCByb29tLicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dC5pbm5lckhUTUwgPSAnPHN0cmlrZT5Ob3Q8L3N0cmlrZT4gdGhlIFNsYWNrIDxzdHJpa2U+Y29tcGxhaW50PC9zdHJpa2U+IDxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZDsgZm9udC13ZWlnaHQ6IGJvbGRcIj5tb2RkaW5nPC9zcGFuPiByb29tLic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldE5vZGUsIG9ic2VydmVyT3B0aW9ucyk7XG4gICAgICAgIH0sIDIwMCk7XG5cbiAgICAgICAgaWYgKHNldHRpbmdzLnVucmVhZF9vbl90aXRsZSkge1xuICAgICAgICAgICAgLy8gQXZvaWQgYWRkaW5nICogb3IgISBvbiB0aGUgdGl0bGVcbiAgICAgICAgICAgIHZhciB0YXJnZXROb2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigndGl0bGUnKVxuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH07XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnRpdGxlLnN0YXJ0c1dpdGgoJyonKSB8fCBkb2N1bWVudC50aXRsZS5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2N1bWVudC50aXRsZS5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0Tm9kZSwgY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlYWN0IG1vbmtleSBwYXRjaFxuICAgICAgICB2YXIgcmVhY3RJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHcgPSB3aW5kb3cgYXMgYW55O1xuICAgICAgICAgICAgaWYgKHcuUmVhY3QgJiYgdy5SZWFjdC5jcmVhdGVFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChyZWFjdEludGVydmFsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQ3JlYXRlRWxlbWVudCA9IHcuUmVhY3QuY3JlYXRlRWxlbWVudDtcblxuICAgICAgICAgICAgLy8gRGVmaW5lIGEgbmV3IGZ1bmN0aW9uXG4gICAgICAgICAgICB3LlJlYWN0LmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IG91ciBhcmd1bWVudHMgYXMgYW4gYXJyYXlcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gb3JpZ2luYWxDcmVhdGVFbGVtZW50LmFwcGx5KHcuUmVhY3QsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYXJnc1swXS5kaXNwbGF5TmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcHMgPSByZXNwb25zZS5wcm9wcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnVucmVhZF9vbl90aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgdGhlIGN1cnJlbnQgY2hhbm5lbCBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lID09PSAnTWVzc2FnZVBhbmUnICYmIHByb3BzLmNoYW5uZWxJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudENoYW5uZWxJZCA9IHByb3BzLmNoYW5uZWxJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHdlIHVuc2V0IHRoZSB0aXRsZSBtYXJrZXIgd2hlbiB3ZSBoYXZlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgPT09ICdVbnJlYWRCYW5uZXInICYmIHByb3BzLmNoYW5uZWxJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcHJvcHMuaGFzVW5yZWFkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3LkN1cnJlbnRVbnJlYWQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY3VtZW50LnRpdGxlLnJlcGxhY2UoL14oKFtcXCohXSApfChcXChbMC05XStcXCkgKSkqLywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sIDEwMCk7XG5cbiAgICB9LCByZXMuc2V0dGluZ3MgfHwgJ3t9Jyk7XG59KTsiXSwic291cmNlUm9vdCI6IiJ9