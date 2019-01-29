import BasePlugin from "./basePlugin";

export default class MaintainThreadToChannel extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptXHR = true;
    }

    public interceptXHR(request, method, path, async) {
        if (path.startsWith("/api/chat.postMessage") || path.startsWith("/api/chat.update")) {
            const oldSend = request.send.bind(request);
            const send = e => {
                if (e.get("reply_broadcast") === "true") {
                    [...document.getElementsByClassName("reply_broadcast_toggle")].forEach(el => {
                        (el as any).checked = true;
                    });
                    [...document.getElementsByClassName("p-threads_footer__broadcast_checkbox")].forEach(el => {
                        (el as any).checked = true;
                    });
                }
                oldSend(e);
            };
            request.send = send.bind(request);
        }
    }
}
