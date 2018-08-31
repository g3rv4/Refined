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
    }, res.settings || '{}');
});


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2JhY2tncm91bmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0RBQTBDLGdDQUFnQztBQUMxRTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGdFQUF3RCxrQkFBa0I7QUFDMUU7QUFDQSx5REFBaUQsY0FBYztBQUMvRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQXlDLGlDQUFpQztBQUMxRSx3SEFBZ0gsbUJBQW1CLEVBQUU7QUFDckk7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7O0FBR0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDbEZBLFNBQVMsWUFBWSxDQUFDLE1BQThCLEVBQUUsSUFBWTtJQUM5RCxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQztJQUN4QyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMs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USxFQUFFLEVBQUU7Z0JBQ2hELElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDekQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSywrQkFBK0IsRUFBRTtvQkFDNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyw0SEFBNEgsQ0FBQztpQkFDako7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2xELENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVaLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImJhY2tncm91bmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL3NyYy9iYWNrZ3JvdW5kLnRzXCIpO1xuIiwiZnVuY3Rpb24gaW5qZWN0U2NyaXB0KHNvdXJjZTogKGRhdGE6IHN0cmluZykgPT4gdm9pZCwgZGF0YTogc3RyaW5nKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgIGVsZW0udHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG4gICAgZWxlbS5pbm5lckhUTUwgPSBgKCR7c291cmNlfSkoJHtkYXRhfSlgO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydzZXR0aW5ncyddLCByZXMgPT4ge1xuICAgIGluamVjdFNjcmlwdChmdW5jdGlvbiAoc2V0dGluZ3M6IGFueSkge1xuICAgICAgICBjb25zdCBoaWRkZW5faWRzID0gc2V0dGluZ3MuaGlkZGVuX2lkcyA/IHNldHRpbmdzLmhpZGRlbl9pZHMuc3BsaXQoXCIsXCIpLm1hcChzID0+IHMudHJpbSgpKSA6IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJpbmRSZXNwb25zZShyZXF1ZXN0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VUZXh0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVxdWVzdC5fX2RlZmluZUdldHRlcl9fKFwicmVzcG9uc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXJNZXNzYWdlcyhtZXNzYWdlcykge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGhpZGRlbiBib3RzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLmZpbHRlcihtID0+IGhpZGRlbl9pZHMuaW5kZXhPZihtLmJvdF9pZCkgPT09IC0xICYmIGhpZGRlbl9pZHMuaW5kZXhPZihtLnVzZXIpID09PSAtMSk7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSByZWFjdGlvbnMgYW5kIGZpbGVzXG4gICAgICAgICAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLm1hcChtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIG0udGV4dCA9IG0udGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5yZWFjdGlvbnMgJiYgc2V0dGluZ3Mub25seV9teV9yZWFjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0udXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbS5yZWFjdGlvbnMgPSBtLnJlYWN0aW9ucy5maWx0ZXIociA9PiByLnVzZXJzLmluZGV4T2YobXlfaWQpICE9PSAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLnJlYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLnJlYWN0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobS5maWxlcyAmJiBzZXR0aW5ncy5oaWRlX2dkcml2ZV9wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIG0uZmlsZXMgPSBtLmZpbGVzLmZpbHRlcihmID0+IGYuZXh0ZXJuYWxfdHlwZSAhPT0gXCJnZHJpdmVcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbS5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLmF0dGFjaG1lbnRzICYmIHNldHRpbmdzLmhpZGVfdXJsX3ByZXZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG0uYXR0YWNobWVudHMgPSBtLmF0dGFjaG1lbnRzLmZpbHRlcihtID0+ICFtLmZyb21fdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzQ29udmVyc2F0aW9uc1ZpZXcocmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgbXlfaWQgPSBkYXRhLnNlbGYuaWQ7XG5cbiAgICAgICAgICAgIGRhdGEuaGlzdG9yeS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEuaGlzdG9yeS5tZXNzYWdlcyk7XG4gICAgICAgICAgICBiaW5kUmVzcG9uc2UocmVxdWVzdCwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcHJvY2Vzc0NvbnZlcnNhdGlvbnMocmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgZGF0YS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEubWVzc2FnZXMpO1xuXG4gICAgICAgICAgICBiaW5kUmVzcG9uc2UocmVxdWVzdCwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG15X2lkID0gJyc7XG4gICAgICAgIHZhciBwcm94aWVkID0gKHdpbmRvdyBhcyBhbnkpLlhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuO1xuICAgICAgICBjb25zdCByZSA9IC9AKFteQD5dKyk+L2c7XG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5YTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXRob2QsIHBhdGgsIGFzeW5jKSB7XG4gICAgICAgICAgICBsZXQgb2xkTGlzdGVuZXIgPSBlID0+IHsgfTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZSkge1xuICAgICAgICAgICAgICAgIG9sZExpc3RlbmVyID0gdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UuYmluZCh0aGlzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhdGggPT0gJy9hcGkvY29udmVyc2F0aW9ucy52aWV3Jykge1xuICAgICAgICAgICAgICAgIHRoaXMub25yZWFkeXN0YXRlY2hhbmdlID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0NvbnZlcnNhdGlvbnNWaWV3KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG9sZExpc3RlbmVyKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwvYXBpXFwvY29udmVyc2F0aW9uc1xcLmhpc3RvcnkvKSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25yZWFkeXN0YXRlY2hhbmdlID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0NvbnZlcnNhdGlvbnModGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb2xkTGlzdGVuZXIoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvY2hhdC5wb3N0TWVzc2FnZScpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkU2VuZCA9IHRoaXMuc2VuZC5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVGV4dCA9IGUuZ2V0KCd0ZXh0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmaW5hbFRleHQgPSBvcmlnaW5hbFRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoKFteXFwpXSspXFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhhbmdvdXRfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3OiBhbnkgPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbE1lc3NhZ2UgPSBmaW5hbFRleHQudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1c2VyTmFtZXMgPSBbdy5UUy5tb2RlbC51c2VyLnByb2ZpbGUuZGlzcGxheV9uYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxNZXNzYWdlLmluZGV4T2YoXCJoYW5nb3V0IFwiKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gZmluYWxUZXh0LnN1YnN0cmluZyg4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXJsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG1hdGNoID0gcmUuZXhlYyhuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyTmFtZXMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJOYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJOYW1lcyA9IHVzZXJOYW1lcy5tYXAodSA9PiB1Lm5vcm1hbGl6ZSgnTkZEJykucmVwbGFjZSgvW1xcdTAzMDAtXFx1MDM2Zl0vZywgXCJcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyTmFtZXMuc29ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSB1c2VyTmFtZXMuam9pbignLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgdXNlIHRoZSB0ZXh0IHNlcGFyYXRlZCBieSBoeXBoZW5zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IG5hbWUucmVwbGFjZSgnICcsICctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gdXJsLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXpBLVowLTktXS9nLCBcIi1cIikucmVwbGFjZSgvLSsvZywgXCItXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVGV4dCA9IGBoYW5nb3V0ICR7bmFtZX06ICR7c2V0dGluZ3MuaGFuZ291dF91cmwucmVwbGFjZSgnJG5hbWUkJywgdXJsKX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZ2V0KCdyZXBseV9icm9hZGNhc3QnKSA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFsuLi5kb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXBseV9icm9hZGNhc3RfdG9nZ2xlJyldLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBhbnkpLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBlLnNldCgndGV4dCcsIGZpbmFsVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG9sZFNlbmQoZSk7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3hpZWQuYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwcm94eSB0aGUgd2luZG93LldlYlNvY2tldCBvYmplY3RcbiAgICAgICAgdmFyIFdlYlNvY2tldFByb3h5ID0gbmV3IFByb3h5KCh3aW5kb3cgYXMgYW55KS5XZWJTb2NrZXQsIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdDogZnVuY3Rpb24gKHRhcmdldCwgYXJncykge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGJpbmRXZWJTb2NrZXREYXRhKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50Ll9fZGVmaW5lR2V0dGVyX18oXCJkYXRhXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgV2ViU29ja2V0IGluc3RhbmNlXG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgdGFyZ2V0KC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZUhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09IFwicmVhY3Rpb25fYWRkZWRcIiAmJiBzZXR0aW5ncy5vbmx5X215X3JlYWN0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudXNlciAhPSBteV9pZCAmJiBkYXRhLml0ZW1fdXNlciAhPSBteV9pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwibWVzc2FnZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIGlnbm9yZWQgdXNlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoaWRkZW5faWRzLmluZGV4T2YoZGF0YS51c2VyKSAhPT0gLTEgfHwgaGlkZGVuX2lkcy5pbmRleE9mKGRhdGEuYm90X2lkKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRpZCBzb21lYm9keSBzZW5kIGEgbWFya2Rvd24gbGluaz8gcGFyc2UgaXQhXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS50ZXh0ID0gZGF0YS50ZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKDwoW15cXCldKyk+XFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gaXQgY29tZXMgd2l0aCBhbiBhdHRhY2htZW50LCBpdCdzIGluIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLm1lc3NhZ2UgJiYgZGF0YS5tZXNzYWdlLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UudGV4dCA9IGRhdGEubWVzc2FnZS50ZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKDwoW15cXCldKyk+XFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgZ2RyaXZlIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhpZGVfZ2RyaXZlX3ByZXZpZXcgJiYgZGF0YS5tZXNzYWdlICYmIGRhdGEubWVzc2FnZS5maWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS5maWxlcyA9IGRhdGEubWVzc2FnZS5maWxlcy5maWx0ZXIoZiA9PiBmLmV4dGVybmFsX3R5cGUgIT09IFwiZ2RyaXZlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5tZXNzYWdlLmZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5tZXNzYWdlLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSBwcmV2aWV3IHVybHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuaGlkZV91cmxfcHJldmlld3MgJiYgZGF0YS5tZXNzYWdlICYmIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cyA9IGRhdGEubWVzc2FnZS5hdHRhY2htZW50cy5maWx0ZXIobSA9PiAhbS5mcm9tX3VybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGEubWVzc2FnZS5hdHRhY2htZW50cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBiaW5kV2ViU29ja2V0RGF0YShldmVudCwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1lc3NhZ2VIYW5kbGVyKTtcblxuICAgICAgICAgICAgICAgIC8vIHJldHVybiB0aGUgV2ViU29ja2V0IGluc3RhbmNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyByZXBsYWNlIHRoZSBuYXRpdmUgV2ViU29ja2V0IHdpdGggdGhlIHByb3h5XG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5XZWJTb2NrZXQgPSBXZWJTb2NrZXRQcm94eTtcblxuICAgICAgICBpZiAoc2V0dGluZ3MudGhyZWFkc19vbl9jaGFubmVsKSB7XG4gICAgICAgICAgICAvLyBhbHdheXMgcmVwbHkgdG8gdGhlIGNoYW5uZWwuLi4gVE9ETzogRG9uJ3QgdXNlIERPTU5vZGVJbnNlcnRlZFxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NTm9kZUluc2VydGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjbCA9IChlLnRhcmdldCBhcyBhbnkpLmNsYXNzTGlzdDtcbiAgICAgICAgICAgICAgICBpZiAoY2wgJiYgY2wuY29udGFpbnMoJ3JlcGx5X2NvbnRhaW5lcl9pbmZvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3JlcGx5X2Jyb2FkY2FzdF90b2dnbGUnKV0uZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAoZWwgYXMgYW55KS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY3NzID0gJyc7XG4gICAgICAgIGlmIChzZXR0aW5ncy5oaWRlX3N0YXR1c19lbW9qaSkge1xuICAgICAgICAgICAgY3NzICs9IGBcbi5jLWN1c3RvbV9zdGF0dXMsIC5tZXNzYWdlX2N1cnJlbnRfc3RhdHVzIHtcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG59YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MucmVhY3Rpb25zX29uX3RoZV9yaWdodCkge1xuICAgICAgICAgICAgY3NzICs9IGBcbi5jLXJlYWN0aW9uX2JhciB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGJvdHRvbTogNXB4O1xuICAgIHJpZ2h0OiAxLjI1cmVtO1xufVxuLmMtbWVzc2FnZV9fYWN0aW9ucy0tbWVudS1zaG93aW5nLCAuYy1tZXNzYWdlX19hY3Rpb25zIHtcbiAgICB0b3A6IHVuc2V0ICFpbXBvcnRhbnQ7XG4gICAgYm90dG9tOiAyOHB4O1xufVxuQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTEwMHB4KSB7XG4gICAgLmMtcmVhY3Rpb25fYmFyIHtcbiAgICAgICAgZGlzcGxheTogbm9uZTtcbiAgICB9XG59XG4uYy1yZWFjdGlvbl9hZGQsIC5jLXJlYWN0aW9uX2FkZDpob3ZlciB7XG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xufVxuYDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIHZhciBzaGVldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzaGVldC50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgICAgICh3aW5kb3cgYXMgYW55KS5jdXN0b21TaGVldCA9IHNoZWV0O1xuICAgICAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSkuYXBwZW5kQ2hpbGQoc2hlZXQpO1xuICAgICAgICAgICAgc2hlZXQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaXggZWRpdCBvbiBhIG1lc3NhZ2Ugd2l0aCBhIGxpbmtcbiAgICAgICAgdmFyIGludGVydmFsTWVzc2FnZUVkaXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB3OiBhbnkgPSB3aW5kb3c7XG4gICAgICAgICAgICBpZiAody5UUyAmJiB3LlRTLmZvcm1hdCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxNZXNzYWdlRWRpdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgb2xkID0gdy5UUy5mb3JtYXQuZm9ybWF0V2l0aE9wdGlvbnM7XG4gICAgICAgICAgICB3LlRTLmZvcm1hdC5mb3JtYXRXaXRoT3B0aW9ucyA9ICh0LCBuLCByKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIgJiYgci5mb3JfZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICB0ID0gdC5yZXBsYWNlKC88KFtePD5cXHxdKylcXHwoW148Pl0rKT4vZywgKF8sIHVybCwgdGl0bGUpID0+IGBbJHt0aXRsZX1dKCR7dXJsfSlgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9sZCh0LCBuLCByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcblxuICAgICAgICAvLyBJIGhhZCB0b1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0Tm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWVzc2FnZXNfaGVhZGVyXCIpO1xuICAgICAgICAgICAgaWYgKHRhcmdldE5vZGUpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG9ic2VydmVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChlLCBvYnNlcnZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYW5uZWxfdG9waWNfdGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICYmIHRleHQuaW5uZXJUZXh0ID09PSAnTm90IHRoZSBTbGFjayBjb21wbGFpbnQgcm9vbS4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQuaW5uZXJIVE1MID0gJzxzdHJpa2U+Tm90PC9zdHJpa2U+IHRoZSBTbGFjayA8c3RyaWtlPmNvbXBsYWludDwvc3RyaWtlPiA8c3BhbiBzdHlsZT1cImNvbG9yOiByZWQ7IGZvbnQtd2VpZ2h0OiBib2xkXCI+bW9kZGluZzwvc3Bhbj4gcm9vbS4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXROb2RlLCBvYnNlcnZlck9wdGlvbnMpO1xuICAgICAgICB9LCAyMDApO1xuXG4gICAgfSwgcmVzLnNldHRpbmdzIHx8ICd7fScpO1xufSk7Il0sInNvdXJjZVJvb3QiOiIifQ==