import BasePlugin from './basePlugin.js';

export default class DoNotOpenLinksOnApp extends BasePlugin {
    public init() {
        this.setIntervalUntil(
            () => {
                const w = window as any;
                return w.TS && w.TS.magic_login;
            },
            () => {
                const w = window as any;
                const old = w.TS.magic_login.execute;
                w.TS.magic_login.execute = (obj: any) => {
                    if (obj.browser_uri) {
                        window.location.href = obj.browser_uri;
                    } else {
                        return old(obj);
                    }
                }
            }
        )

        return {};
    }
}
