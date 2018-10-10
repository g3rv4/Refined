import BasePlugin from "./plugins/basePlugin";
import availablePlugins from "./available_plugins";

const thisScript = document.getElementById("taut-injected-script");
const settings = JSON.parse(thisScript.dataset.settings);

let css = "";
const plugins = Object.keys(settings);
const enabledPlugins: BasePlugin[] = [];
for (const pluginName of plugins) {
    if (settings[pluginName].enabled && availablePlugins[pluginName]) {
        const plugin: BasePlugin = new availablePlugins[pluginName](pluginName, settings[pluginName]);
        enabledPlugins.push(plugin);

        css += plugin.getCSS();
    }
}

const wsPlugins = enabledPlugins.filter(p => p.shouldInterceptWS);
const xhrPlugins = enabledPlugins.filter(p => p.shouldInterceptXHR);
const reactPlugins = enabledPlugins.filter(p => p.shouldInterceptReact);

const w: any = window;
if (css) {
    const sheet = document.createElement("style");
    sheet.type = "text/css";
    w.customSheet = sheet;
    (document.head || document.getElementsByTagName("head")[0]).appendChild(sheet);
    sheet.appendChild(document.createTextNode(css));
}

if (xhrPlugins.length) {
    const proxied = w.XMLHttpRequest.prototype.open;
    w.XMLHttpRequest.prototype.open = function (method, path, async): any {
        this.bindResponse = response => {
            this.__defineGetter__("responseText", () => response);
            this.__defineGetter__("response", () => response);
        };

        for (const xhrPlugin of xhrPlugins) {
            xhrPlugin.interceptXHR(this, method, path, async);
        }

        return proxied.apply(this, [].slice.call(arguments));
    };
}

if (wsPlugins.length) {
    // proxy the window.WebSocket object
    const WebSocketProxy = new Proxy(w.WebSocket, {
        construct(target, args) {
            function bindWebSocketData(event, data) {
                event.__defineGetter__("data", () => data);
            }

            // create WebSocket instance
            const instance = new target(...args);

            const messageHandler = event => {
                let data = JSON.parse(event.data);

                for (const wsPlugin of wsPlugins) {
                    data = wsPlugin.interceptWS(data);
                }

                bindWebSocketData(event, JSON.stringify(data));
            };

            instance.addEventListener("message", messageHandler);

            // return the WebSocket instance
            return instance;
        }
    });

    // replace the native WebSocket with the proxy
    w.WebSocket = WebSocketProxy;
}

if (reactPlugins.length) {
    const reactInterval = setInterval(() => {
        const ww = window as any;
        if (ww.React && ww.React.createElement) {
            clearInterval(reactInterval);
        } else {
            return;
        }

        // Store the original function
        const originalCreateElement = w.React.createElement;

        // Define a new function
        ww.React.createElement = (...args) => {
            const displayName = args[0].displayName;
            if (displayName) {
                let props = args[1];
                for (const reactPlugin of reactPlugins) {
                    props = reactPlugin.interceptReact(displayName, props);
                }
                args[1] = props;
            }

            return originalCreateElement.apply(w.React, args);
        };
    }, 100);
}

(async () => {
    for (const plugin of enabledPlugins) {
        await plugin.init();
    }
})();
