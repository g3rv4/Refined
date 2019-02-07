import BasePlugin, { IXHRParameters } from "./basePlugin";

export default class MaintainThreadToChannel extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptXHR = true;
    }

    public interceptXHR(request, parameters: IXHRParameters) {
        if (parameters.path.startsWith("/api/chat.postMessage") || parameters.path.startsWith("/api/chat.update")) {
            const oldSend = request.send.bind(request);
            const send = e => {
                if (e.get("reply_broadcast") === "true") {
                    [...document.getElementsByClassName("reply_broadcast_toggle")].forEach(el => {
                        this.updateReactCheckbox(el as HTMLInputElement, true);
                    });
                    [...document.getElementsByClassName("p-threads_footer__broadcast_checkbox")].forEach(el => {
                        this.updateReactCheckbox(el as HTMLInputElement, true);
                    });
                }
                oldSend(e);
            };
            request.send = send.bind(request);
        }
    }
}
