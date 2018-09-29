import Plugin from './plugins/plugin.js';

const thisScript = document.getElementById('taut-injected-script');
const settings = JSON.parse(thisScript.dataset.settings);

const wsPlugins: Plugin[] = []; // plugins that mess with websockets
const xhrPlugins: Plugin[] = []; // plugins that mess with xhr

// ugh, while Firefox doesn't implement dynamic module loading, this is going to make me sad
import HideUsers from './plugins/hideUsers.js';
import Hangouts from './plugins/hangouts.js';
const availablePlugins = {
    hideUsers: HideUsers,
    hangouts: Hangouts
}
// </sadness>

const plugins = Object.keys(settings);
for (let i = 0; i < plugins.length; i++) {
    const pluginName = plugins[i];
    if (settings[pluginName].enabled && availablePlugins[pluginName]) {
        const plugin = new availablePlugins[pluginName](settings[pluginName]);
        plugin.init(wsPlugins, xhrPlugins);
    }
}

const w: any = window;
if (xhrPlugins.length) {
    var proxied = w.XMLHttpRequest.prototype.open;
    w.XMLHttpRequest.prototype.open = function (method, path, async) {
        for (let i = 0; i < xhrPlugins.length; i++) {
            xhrPlugins[i].interceptXHR(this, method, path, async);
        }

        this.bindResponse = (response) => {
            this.__defineGetter__("responseText", function () {
                return response
            });
            this.__defineGetter__("response", function () {
                return response
            });
        }

        return proxied.apply(this, [].slice.call(arguments));
    };
}

if (wsPlugins.length) {
    // proxy the window.WebSocket object
    const WebSocketProxy = new Proxy(w.WebSocket, {
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

                for (let i = 0; i < wsPlugins.length; i++) {
                    data = wsPlugins[i].processWebSocketData(data);
                }

                bindWebSocketData(event, JSON.stringify(data));
            };

            instance.addEventListener('message', messageHandler);

            // return the WebSocket instance
            return instance;
        }
    });

    // replace the native WebSocket with the proxy
    w.WebSocket = WebSocketProxy;
}