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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/content_script.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/content_script.ts":
/*!*******************************!*\
  !*** ./src/content_script.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports) {

function injectScript(source, data) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}
chrome.storage.sync.get(['acceptedRisks', 'settings'], res => {
    chrome.runtime.sendMessage({ type: 'slackPageOpened' });
    if (!res.acceptedRisks) {
        chrome.runtime.sendMessage({ type: 'slackWithoutAccepted' });
        return;
    }
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
                    t = t.replace(/<(?!!)([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnRfc2NyaXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtEQUEwQyxnQ0FBZ0M7QUFDMUU7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxnRUFBd0Qsa0JBQWtCO0FBQzFFO0FBQ0EseURBQWlELGNBQWM7QUFDL0Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlEQUF5QyxpQ0FBaUM7QUFDMUUsd0hBQWdILG1CQUFtQixFQUFFO0FBQ3JJO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7OztBQUdBO0FBQ0E7Ozs7Ozs7Ozs7OztBQ2xGQSxTQUFTLFlBQVksQ0FBQyxNQUE4QixFQUFFLElBQVk7SUFDOUQsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1QyxJQUFJLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDO0lBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUM7SUFDeEMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxD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VyxLQUFLLGFBQWEsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFOzRCQUNsRCxDQUFDLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQzt5QkFDeEM7d0JBRUQsc0RBQXNEO3dCQUN0RCxJQUFJLFdBQVcsS0FBSyxjQUFjLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRTs0QkFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUU7Z0NBQ25CLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO2dDQUNwQixRQUFRLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFDOzZCQUM3RTt5QkFDSjtxQkFDSjtpQkFDSjtnQkFFRCxPQUFPLFFBQVEsQ0FBQztZQUNwQixDQUFDLENBQUM7UUFDTixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFWixDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJjb250ZW50X3NjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL2NvbnRlbnRfc2NyaXB0LnRzXCIpO1xuIiwiZnVuY3Rpb24gaW5qZWN0U2NyaXB0KHNvdXJjZTogKGRhdGE6IHN0cmluZykgPT4gdm9pZCwgZGF0YTogc3RyaW5nKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgIGVsZW0udHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG4gICAgZWxlbS5pbm5lckhUTUwgPSBgKCR7c291cmNlfSkoJHtkYXRhfSlgO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydhY2NlcHRlZFJpc2tzJywgJ3NldHRpbmdzJ10sIHJlcyA9PiB7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe3R5cGU6ICdzbGFja1BhZ2VPcGVuZWQnfSk7XG4gICAgaWYgKCFyZXMuYWNjZXB0ZWRSaXNrcykge1xuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7dHlwZTogJ3NsYWNrV2l0aG91dEFjY2VwdGVkJ30pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGluamVjdFNjcmlwdChmdW5jdGlvbiAoc2V0dGluZ3M6IGFueSkge1xuICAgICAgICBjb25zdCBoaWRkZW5faWRzID0gc2V0dGluZ3MuaGlkZGVuX2lkcyA/IHNldHRpbmdzLmhpZGRlbl9pZHMuc3BsaXQoXCIsXCIpLm1hcChzID0+IHMudHJpbSgpKSA6IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJpbmRSZXNwb25zZShyZXF1ZXN0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VUZXh0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXJNZXNzYWdlcyhtZXNzYWdlcykge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGhpZGRlbiBib3RzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLmZpbHRlcihtID0+IGhpZGRlbl9pZHMuaW5kZXhPZihtLmJvdF9pZCkgPT09IC0xICYmIGhpZGRlbl9pZHMuaW5kZXhPZihtLnVzZXIpID09PSAtMSk7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSByZWFjdGlvbnMgYW5kIGZpbGVzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLm1hcChtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIG0udGV4dCA9IG0udGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5yZWFjdGlvbnMgJiYgc2V0dGluZ3Mub25seV9teV9yZWFjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0udXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbS5yZWFjdGlvbnMgPSBtLnJlYWN0aW9ucy5maWx0ZXIociA9PiByLnVzZXJzLmluZGV4T2YobXlfaWQpICE9PSAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLnJlYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLnJlYWN0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5maWxlcyAmJiBzZXR0aW5ncy5oaWRlX2dkcml2ZV9wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIG0uZmlsZXMgPSBtLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbS5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLmF0dGFjaG1lbnRzICYmIHNldHRpbmdzLmhpZGVfdXJsX3ByZXZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG0uYXR0YWNobWVudHMgPSBtLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcocmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgaWYgKGRhdGEub2spIHtcbiAgICAgICAgICAgICAgICBteV9pZCA9IGRhdGEuc2VsZi5pZDtcbiAgICAgICAgICAgICAgICBkYXRhLmhpc3RvcnkubWVzc2FnZXMgPSBmaWx0ZXJNZXNzYWdlcyhkYXRhLmhpc3RvcnkubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9ucyhyZXF1ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJpbmRSZXNwb25zZShyZXF1ZXN0LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbXlfaWQgPSAnJztcbiAgICAgICAgdmFyIHByb3hpZWQgPSAod2luZG93IGFzIGFueSkuWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW47XG4gICAgICAgIGNvbnN0IHJlID0gLzxAKFtePl0rKT4vZztcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLlhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1ldGhvZCwgcGF0aCwgYXN5bmMpIHtcbiAgICAgICAgICAgIGxldCBvbGRMaXN0ZW5lciA9IGUgPT4geyB9O1xuICAgICAgICAgICAgaWYgKHRoaXMub25yZWFkeXN0YXRlY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIgPSB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGF0aCA9PSAnL2FwaS9jb252ZXJzYXRpb25zLnZpZXcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRoLm1hdGNoKC9cXC9hcGlcXC9jb252ZXJzYXRpb25zXFwuaGlzdG9yeS8pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzQ29udmVyc2F0aW9ucyh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvbGRMaXN0ZW5lcihlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGguc3RhcnRzV2l0aCgnL2FwaS9jaGF0LnBvc3RNZXNzYWdlJykgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2NoYXQudXBkYXRlJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRTZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxUZXh0ID0gZS5nZXQoJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVGV4dCA9IG9yaWdpbmFsVGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCgoW15cXCldKylcXCkvZywgKF8sIHRleHQsIHVybCkgPT4gYDwke3VybH18JHt0ZXh0fT5gKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGguc3RhcnRzV2l0aCgnL2FwaS9jaGF0LnVwZGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnNldCgncGFyc2UnLCAnbm9uZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhhbmdvdXRfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3OiBhbnkgPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbE1lc3NhZ2UgPSBmaW5hbFRleHQudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZHMgPSBbdy5UUy5tb2RlbC51c2VyLmlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxNZXNzYWdlLmluZGV4T2YoXCJoYW5nb3V0IFwiKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gZmluYWxUZXh0LnN1YnN0cmluZyg4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXJsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG1hdGNoID0gcmUuZXhlYyhuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VySWRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VySWRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlck5hbWVzID0gdy5UUy5tb2RlbC5tZW1iZXJzLmZpbHRlcihtID0+IHVzZXJJZHMuaW5kZXhPZihtLmlkKSAhPSAtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAobSA9PiBtLnByb2ZpbGUuZGlzcGxheV9uYW1lX25vcm1hbGl6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyTmFtZXMuc29ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSB1c2VyTmFtZXMuam9pbignLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgdXNlIHRoZSB0ZXh0IHNlcGFyYXRlZCBieSBoeXBoZW5zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IG5hbWUucmVwbGFjZSgnICcsICctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gdXJsLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXpBLVowLTktXS9nLCBcIi1cIikucmVwbGFjZSgvLSsvZywgXCItXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVGV4dCA9IGBoYW5nb3V0ICR7bmFtZX06ICR7c2V0dGluZ3MuaGFuZ291dF91cmwucmVwbGFjZSgnJG5hbWUkJywgdXJsKX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZ2V0KCdyZXBseV9icm9hZGNhc3QnKSA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFsuLi5kb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXBseV9icm9hZGNhc3RfdG9nZ2xlJyldLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBhbnkpLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBlLnNldCgndGV4dCcsIGZpbmFsVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG9sZFNlbmQoZSk7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3hpZWQuYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwcm94eSB0aGUgd2luZG93LldlYlNvY2tldCBvYmplY3RcbiAgICAgICAgdmFyIFdlYlNvY2tldFByb3h5ID0gbmV3IFByb3h5KCh3aW5kb3cgYXMgYW55KS5XZWJTb2NrZXQsIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdDogZnVuY3Rpb24gKHRhcmdldCwgYXJncykge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGJpbmRXZWJTb2NrZXREYXRhKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50Ll9fZGVmaW5lR2V0dGVyX18oXCJkYXRhXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgV2ViU29ja2V0IGluc3RhbmNlXG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgdGFyZ2V0KC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZUhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09IFwicmVhY3Rpb25fYWRkZWRcIiAmJiBzZXR0aW5ncy5vbmx5X215X3JlYWN0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudXNlciAhPSBteV9pZCAmJiBkYXRhLml0ZW1fdXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwibWVzc2FnZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIGlnbm9yZWQgdXNlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoaWRkZW5faWRzLmluZGV4T2YoZGF0YS51c2VyKSAhPT0gLTEgfHwgaGlkZGVuX2lkcy5pbmRleE9mKGRhdGEuYm90X2lkKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRpZCBzb21lYm9keSBzZW5kIGEgbWFya2Rvd24gbGluaz8gcGFyc2UgaXQhXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS50ZXh0ID0gZGF0YS50ZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKDwoW15cXCldKyk+XFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gaXQgY29tZXMgd2l0aCBhbiBhdHRhY2htZW50LCBpdCdzIGluIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UudGV4dCA9IGRhdGEubWVzc2FnZS50ZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKDwoW15cXCldKyk+XFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgZ2RyaXZlIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhpZGVfZ2RyaXZlX3ByZXZpZXcgJiYgZGF0YS5tZXNzYWdlICYmIGRhdGEubWVzc2FnZS5maWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS5maWxlcyA9IGRhdGEubWVzc2FnZS5maWxlcy5maWx0ZXIoZiA9PiBmLmV4dGVybmFsX3R5cGUgIT09IFwiZ2RyaXZlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5tZXNzYWdlLmZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5tZXNzYWdlLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSBwcmV2aWV3IHVybHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuaGlkZV91cmxfcHJldmlld3MgJiYgZGF0YS5tZXNzYWdlICYmIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cyA9IGRhdGEubWVzc2FnZS5hdHRhY2htZW50cy5maWx0ZXIobSA9PiAhbS5mcm9tX3VybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy51bnJlYWRfb25fdGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3ID0gd2luZG93IGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jaGFubmVsID09IHcuQ3VycmVudENoYW5uZWxJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGEgYml0IHdlaXJkLi4uIHRoZXkgYWx3YXlzIHNlbmQgYSBtZXNzYWdlLCBldmVuIGlmIGl0J3MgYSBtZXNzYWdlIGluc2lkZSBhIHRocmVhZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGV5IHRoZW4gc2VuZCB0aGUgbWVzc2FnZV9yZXBpZWQgZXZlbnQsIGFuZCBpZiBpdCdzIGEgdGhyZWFkZWQgbWVzc2FnZSBhbHNvIHNlbnQgdG8gdGhlIGNoYW5uZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlbiB0aGV5IHNlbmQgYSBtZXNzYWdlX2NoYW5nZWQgZXZlbnQgd2l0aG91dCBhbiBlZGl0ZWQgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hhdCBhcmUgeW91IHNheWluZz8gdGhhdCB0aGlzIGlzIGEgaGFjaz8geWVzLCB0aGUgd2hvbGUgdGhpbmcgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLnN1YnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0J3MgYSBtZXNzYWdlLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEudGhyZWFkX3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQncyBub3QgaW4gYSB0aHJlYWQhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdy5DdXJyZW50VW5yZWFkKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zdWJ0eXBlID09PSAnbWVzc2FnZV9jaGFuZ2VkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWVzc2FnZV9jaGFuZ2VkLCB3ZSBzdGlsbCBkb24ndCBrbm93IG11Y2ggYWJvdXQgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5tZXNzYWdlLmVkaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gYSB0aHJlYWRlZCBtZXNzYWdlIGlzIHNlbnQgdG8gdGhlIGNoYXQsIHRoZXJlJ3Mgbm8gZWRpdGVkIHByb3BlcnR5LiBBcmUgdGhlcmUgYW55XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXIgaW5zdGFuY2VzIHdoZW4gdGhpcyBoYXBwZW5zPyBJIGhhdmUgbm8gZnJlYWtpbmcgaWRlYSA6KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudFVucmVhZCsrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGl0bGUgPSBkb2N1bWVudC50aXRsZS5yZXBsYWNlKC9eKChbXFwqIV0gKXwoXFwoWzAtOV0rXFwpICkpKi8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHcuQ3VycmVudFVucmVhZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBgKCR7dy5DdXJyZW50VW5yZWFkfSkgJHt0aXRsZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJpbmRXZWJTb2NrZXREYXRhKGV2ZW50LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgbWVzc2FnZUhhbmRsZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSBXZWJTb2NrZXQgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHJlcGxhY2UgdGhlIG5hdGl2ZSBXZWJTb2NrZXQgd2l0aCB0aGUgcHJveHlcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLldlYlNvY2tldCA9IFdlYlNvY2tldFByb3h5O1xuXG4gICAgICAgIGlmIChzZXR0aW5ncy50aHJlYWRzX29uX2NoYW5uZWwpIHtcbiAgICAgICAgICAgIC8vIGFsd2F5cyByZXBseSB0byB0aGUgY2hhbm5lbC4uLiBUT0RPOiBEb24ndCB1c2UgRE9NTm9kZUluc2VydGVkXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Ob2RlSW5zZXJ0ZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsID0gKGUudGFyZ2V0IGFzIGFueSkuY2xhc3NMaXN0O1xuICAgICAgICAgICAgICAgIGlmIChjbCAmJiBjbC5jb250YWlucygncmVwbHlfY29udGFpbmVyX2luZm8nKSkge1xuICAgICAgICAgICAgICAgICAgICBbLi4uZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncmVwbHlfYnJvYWRjYXN0X3RvZ2dsZScpXS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBhbnkpLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjc3MgPSAnJztcbiAgICAgICAgaWYgKHNldHRpbmdzLmhpZGVfc3RhdHVzX2Vtb2ppKSB7XG4gICAgICAgICAgICBjc3MgKz0gYFxuLmMtY3VzdG9tX3N0YXR1cywgLm1lc3NhZ2VfY3VycmVudF9zdGF0dXMge1xuICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbn1gO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5yZWFjdGlvbnNfb25fdGhlX3JpZ2h0KSB7XG4gICAgICAgICAgICBjc3MgKz0gYFxuLmMtcmVhY3Rpb25fYmFyIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgYm90dG9tOiA1cHg7XG4gICAgcmlnaHQ6IDEuMjVyZW07XG59XG4uYy1tZXNzYWdlX19hY3Rpb25zLS1tZW51LXNob3dpbmcsIC5jLW1lc3NhZ2VfX2FjdGlvbnMge1xuICAgIHRvcDogdW5zZXQgIWltcG9ydGFudDtcbiAgICBib3R0b206IDI4cHg7XG59XG5AbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMTAwcHgpIHtcbiAgICAuYy1yZWFjdGlvbl9iYXIge1xuICAgICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbn1cbi5jLXJlYWN0aW9uX2FkZCwgLmMtcmVhY3Rpb25fYWRkOmhvdmVyIHtcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG59XG5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgdmFyIHNoZWV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgICAgIHNoZWV0LnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgICAgICAgKHdpbmRvdyBhcyBhbnkpLmN1c3RvbVNoZWV0ID0gc2hlZXQ7XG4gICAgICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzaGVldCk7XG4gICAgICAgICAgICBzaGVldC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpeCBlZGl0IG9uIGEgbWVzc2FnZSB3aXRoIGEgbGlua1xuICAgICAgICB2YXIgaW50ZXJ2YWxNZXNzYWdlRWRpdCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHc6IGFueSA9IHdpbmRvdztcbiAgICAgICAgICAgIGlmICh3LlRTICYmIHcuVFMuZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbE1lc3NhZ2VFZGl0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBvbGQgPSB3LlRTLmZvcm1hdC5mb3JtYXRXaXRoT3B0aW9ucztcbiAgICAgICAgICAgIHcuVFMuZm9ybWF0LmZvcm1hdFdpdGhPcHRpb25zID0gKHQsIG4sIHIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAociAmJiByLmZvcl9lZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHQgPSB0LnJlcGxhY2UoLzwoPyEhKShbXjw+XFx8XSspXFx8KFtePD5dKyk+L2csIChfLCB1cmwsIHRpdGxlKSA9PiBgWyR7dGl0bGV9XSgke3VybH0pYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvbGQodCwgbiwgcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG5cbiAgICAgICAgLy8gSSBoYWQgdG9cbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldE5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1lc3NhZ2VzX2hlYWRlclwiKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXROb2RlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBvYnNlcnZlck9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoZSwgb2JzZXJ2ZXIpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFubmVsX3RvcGljX3RleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAmJiB0ZXh0LmlubmVyVGV4dCA9PT0gJ05vdCB0aGUgU2xhY2sgY29tcGxhaW50IHJvb20uJykge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0LmlubmVySFRNTCA9ICc8c3RyaWtlPk5vdDwvc3RyaWtlPiB0aGUgU2xhY2sgPHN0cmlrZT5jb21wbGFpbnQ8L3N0cmlrZT4gPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkOyBmb250LXdlaWdodDogYm9sZFwiPm1vZGRpbmc8L3NwYW4+IHJvb20uJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0Tm9kZSwgb2JzZXJ2ZXJPcHRpb25zKTtcbiAgICAgICAgfSwgMjAwKTtcblxuICAgICAgICBpZiAoc2V0dGluZ3MudW5yZWFkX29uX3RpdGxlKSB7XG4gICAgICAgICAgICAvLyBBdm9pZCBhZGRpbmcgKiBvciAhIG9uIHRoZSB0aXRsZVxuICAgICAgICAgICAgdmFyIHRhcmdldE5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd0aXRsZScpXG4gICAgICAgICAgICB2YXIgY29uZmlnID0geyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQudGl0bGUuc3RhcnRzV2l0aCgnKicpIHx8IGRvY3VtZW50LnRpdGxlLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY3VtZW50LnRpdGxlLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXROb2RlLCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVhY3QgbW9ua2V5IHBhdGNoXG4gICAgICAgIHZhciByZWFjdEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdyA9IHdpbmRvdyBhcyBhbnk7XG4gICAgICAgICAgICBpZiAody5SZWFjdCAmJiB3LlJlYWN0LmNyZWF0ZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHJlYWN0SW50ZXJ2YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDcmVhdGVFbGVtZW50ID0gdy5SZWFjdC5jcmVhdGVFbGVtZW50O1xuXG4gICAgICAgICAgICAvLyBEZWZpbmUgYSBuZXcgZnVuY3Rpb25cbiAgICAgICAgICAgIHcuUmVhY3QuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgb3VyIGFyZ3VtZW50cyBhcyBhbiBhcnJheVxuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBvcmlnaW5hbENyZWF0ZUVsZW1lbnQuYXBwbHkody5SZWFjdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBhcmdzWzBdLmRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wcyA9IHJlc3BvbnNlLnByb3BzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MudW5yZWFkX29uX3RpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgY3VycmVudCBjaGFubmVsIGlkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgPT09ICdNZXNzYWdlUGFuZScgJiYgcHJvcHMuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdy5DdXJyZW50Q2hhbm5lbElkID0gcHJvcHMuY2hhbm5lbElkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgd2UgdW5zZXQgdGhlIHRpdGxlIG1hcmtlciB3aGVuIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSA9PT0gJ1VucmVhZEJhbm5lcicgJiYgcHJvcHMuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm9wcy5oYXNVbnJlYWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudFVucmVhZCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jdW1lbnQudGl0bGUucmVwbGFjZSgvXigoW1xcKiFdICl8KFxcKFswLTldK1xcKSApKSovLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSwgMTAwKTtcblxuICAgIH0sIHJlcy5zZXR0aW5ncyB8fCAne30nKTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==