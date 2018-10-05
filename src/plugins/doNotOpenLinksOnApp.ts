import BasePlugin from "./basePlugin.js";

export default class DoNotOpenLinksOnApp extends BasePlugin {
    public async init() {
        const old = await this.getElement(() => {
            const w = window as any;
            return w.TS && w.TS.magic_login;
        });

        const w = window as any;
        w.TS.magic_login.execute = (obj: any) => {
            if (obj.browser_uri) {
                window.location.href = obj.browser_uri;
            } else {
                return old(obj);
            }
        };
    }
}
