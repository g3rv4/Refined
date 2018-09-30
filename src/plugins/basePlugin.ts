export interface InitResponse {
    interceptWS?: boolean,
    interceptXHR?: boolean,
    interceptReact?: boolean
}

export default abstract class BasePlugin {
    protected settings: any;
    protected name: string;

    public constructor(name: string, settings: any) {
        this.name = name;
        this.settings = settings;
    }

    public init(): InitResponse { return {}; };
    public interceptWS(data: any) { return data; }
    public interceptXHR(request, method, path, async) { };
    public interceptReact(displayName, props) { return props; };
    public getCSS() { return ''; }

    protected setUpObserver(targetQuery: string, observerOptions: MutationObserverInit, fn: (records: any[], observer: MutationObserver) => void) {
        this.setIntervileUntil(
            () => !!document.querySelector(targetQuery),
            () => {
                var targetNode = document.querySelector(targetQuery);
                var observer = new MutationObserver((r, o) => {
                    const nodes = r.map(r => [...r.addedNodes] as any)
                        .reduce((a, b) => a.concat(b)) as Node[];

                    fn(nodes, o);
                });
                observer.observe(targetNode, observerOptions);
            })
    }

    protected setIntervileUntil(fn: () => boolean, callback: () => void) {
        const interval = setInterval(() => {
            if (fn()) {
                clearInterval(interval);
            } else {
                return;
            }

            callback();
        }, 200);
    }

    protected getSlackModel() {
        const w = window as any;
        return w.TS.model;
    }

    protected setLocalValue(key: string, value: any) {
        this.setValue(key, value, this.name);
    }

    protected getLocalValue(key: string) {
        return this.getValue(key, this.name);
    }

    protected setGlobalValue(key: string, value: any) {
        this.setValue(key, value);
    }

    protected getGlobalValue(key: string) {
        return this.getValue(key);
    }

    private setValue(key: string, value: any, namespace?: string) {
        const w = window as any;
        if (!w.Taut) {
            w.Taut = {};
        }

        let dest = w.Taut;
        if (namespace) {
            if (!w.Taut[namespace]) {
                w.Taut[namespace] = {};
            }
            dest = w.Taut[namespace];
        }
        dest[key] = value;
    }

    private getValue(key: string, namespace?: string) {
        const w = window as any;
        if (!w.Taut) {
            return undefined;
        }

        let source = w.Taut;
        if (namespace) {
            if (!w.Taut[namespace]) {
                return undefined;
            }
            source = w.Taut[namespace];
        }
        return source[key];
    }
}

export abstract class MessageTweakerPlugin extends BasePlugin {
    public init(): InitResponse {
        return {
            interceptXHR: true,
            interceptWS: true
        };
    }

    protected abstract processXHRMessages(messages: any[]): any[];
    protected abstract processWSMessage(message: any): any;

    public interceptXHR(request, method, path, async) {
        let oldListener = _ => { };
        if (request.onreadystatechange) {
            oldListener = request.onreadystatechange.bind(this);
        }

        if (path === '/api/conversations.view' || path.startsWith('/api/conversations.history')) {
            request.onreadystatechange = e => {
                if (request.readyState == 4) {
                    this.processConversations(request);
                }
                oldListener(e);
            }
        }
    }

    public interceptWS(data: any) {
        if (data.type === "message") {
            data = this.processWSMessage(data);
        }
        return data;
    }

    private processConversations(request) {
        const data = JSON.parse(request.responseText);

        if (data.ok) {
            if (data.history && data.history.messages) {
                data.history.messages = this.processXHRMessages(data.history.messages);
            } else if (data.messages) {
                data.messages = this.processXHRMessages(data.messages);
            }
            request.bindResponse(JSON.stringify(data));
        }
    }
}
