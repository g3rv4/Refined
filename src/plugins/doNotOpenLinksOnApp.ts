import BasePlugin from "./basePlugin";

export default class DoNotOpenLinksOnApp extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        let overriden = false;

        // this can't be done on init() because this function is called in an anonymous function in the document
        // also, to ensure w.TS.magic_logic.execute is injected right before it's used, I'm doing this trick...
        // overriding it when hasFocus is called (they're calling hasFocus right before using it)
        const originalHasFocus = document.hasFocus.bind(document);
        document.hasFocus = () => {
            if (!overriden) {
                const w = window as any;
                if (w.TS && w.TS.magic_login && w.TS.magic_login.execute) {
                    w.TS.magic_login.execute = (obj: any) => {
                        window.location.href = obj.browser_uri;
                    };

                    overriden = true;
                }
            }
            return originalHasFocus();
        };
    }
}
