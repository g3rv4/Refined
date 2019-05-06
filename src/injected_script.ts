import BasePlugin from "./plugins/basePlugin";
import availablePlugins from "./available_plugins";

const thisScript = document.getElementById("refined-injected-script");
const settings = JSON.parse(thisScript.dataset.settings);

let css = "";
let darkcss = "";
const plugins = Object.keys(settings);
const enabledPlugins: BasePlugin[] = [];
for (const pluginName of plugins) {
    if (settings[pluginName].enabled && availablePlugins[pluginName]) {
        const plugin: BasePlugin = new availablePlugins[pluginName](pluginName, settings[pluginName]);
        enabledPlugins.push(plugin);

        css += plugin.getCSS();
        darkcss += plugin.getDarkCSS();
    }
}

const wsPlugins = enabledPlugins.filter(p => p.shouldInterceptWS);
const xhrPlugins = enabledPlugins.filter(p => p.shouldInterceptXHR);
const reactPlugins = enabledPlugins.filter(p => p.shouldInterceptReact);

const w: any = window;
if (css) {
    const sheet = document.createElement("style");
    sheet.id = "refined-css";
    sheet.type = "text/css";
    sheet.media = "screen";
    w.customSheet = sheet;
    (document.head || document.getElementsByTagName("head")[0]).appendChild(sheet);
    sheet.appendChild(document.createTextNode(css));
}

if (darkcss) {
    let darkAttempts = 0;
    const darkInterval = setInterval(() => {
        if (document.querySelector(".darkreader") || document.querySelector(".darkslack")) {
            const sheet = document.createElement("style");
            sheet.id = "refined-dark-css";
            sheet.type = "text/css";
            sheet.media = "screen";
            sheet.className = "darkreader darkslack";
            w.customSheet = sheet;
            (document.head || document.getElementsByTagName("head")[0]).appendChild(sheet);
            sheet.appendChild(document.createTextNode(darkcss));

            clearInterval(darkInterval);
            return;
        }

        darkAttempts++;
        if (darkAttempts > 5) {
            clearInterval(darkInterval);
        }
    }, 500);
}

if (xhrPlugins.length) {
    const proxied = w.XMLHttpRequest.prototype.open;
    w.XMLHttpRequest.prototype.open = function (method: string, path: string, async: boolean): any {
        this.bindResponse = response => {
            this.__defineGetter__("responseText", () => response);
            this.__defineGetter__("response", () => response);
        };

        const parameters = { method, path, async };
        for (const xhrPlugin of xhrPlugins) {
            xhrPlugin.interceptXHR(this, parameters);
        }

        return proxied.apply(this, [parameters.method, parameters.path, parameters.async]);
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
