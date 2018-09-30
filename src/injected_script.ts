import Plugin from './plugins/plugin.js';
import availablePlugins from './available_plugins.js';

const thisScript = document.getElementById('taut-injected-script');
const settings = JSON.parse(thisScript.dataset.settings);

const wsPlugins: Plugin[] = []; // plugins that mess with websockets
const xhrPlugins: Plugin[] = []; // plugins that mess with xhr
const reactPlugins: Plugin[] = []; // plugins that mess with react

const plugins = Object.keys(settings);
for (let i = 0; i < plugins.length; i++) {
    const pluginName = plugins[i];
    if (settings[pluginName].enabled && availablePlugins[pluginName]) {
        const plugin: Plugin = new availablePlugins[pluginName](pluginName, settings[pluginName]);
        const res = plugin.init();

        if (res.interceptXHR) {
            xhrPlugins.push(plugin);
        }
        if (res.interceptWS) {
            wsPlugins.push(plugin);
        }
        if (res.interceptReact) {
            reactPlugins.push(plugin);
        }
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

if (reactPlugins.length) {
    const reactInterval = setInterval(() => {
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
                let props = args[1];
                for (let i = 0; i < reactPlugins.length; i++) {
                    props = reactPlugins[i].interceptReact(displayName, props);
                }
                args[1] = props;
            }

            return originalCreateElement.apply(w.React, args);
        };
    }, 100);
}
