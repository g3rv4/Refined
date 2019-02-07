import BasePlugin, { IXHRParameters } from "./basePlugin";

export default abstract class BaseMessageModifierPlugin extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptXHR = true;
    }

    protected abstract doChange(t: string): string;
    protected abstract undoChange(t: string): string;

    public async init(): Promise<void> {
        const old = await this.getElement(() => {
            const w = window as any;
            return w.TS && w.TS.format && w.TS.format.formatWithOptions;
        });

        const w = window as any;
        w.TS.format.formatWithOptions = (t, n, r) => {
            if (r && r.for_edit) {
                t = this.undoChange(t);
            }
            return old(t, n, r);
        };
    }

    public interceptXHR(request, parameters: IXHRParameters) {
        if (parameters.path.startsWith("/api/conversations.setTopic") || parameters.path.startsWith("/api/chat.postMessage") || parameters.path.startsWith("/api/chat.update")) {
            const oldSend = request.send.bind(request);
            const send = e => {
                // setTopic has the "topic" key, while "postMessage" and "update" use the "text" key
                const key = e.has("topic") ? "topic" : "text";

                let text = e.get(key);

                const w = window as any;
                const textBlocksRegex = new RegExp(w.TSF.pre_rx.r);
                const blocks = text.match(textBlocksRegex) || [];

                for (let i = 0; i < blocks.length; i++) {
                    text = text.replace(blocks[i], `||refinedBlock${i}||`);
                }

                const codeRegex = new RegExp(w.TSF.code_rx.r);
                const code = text.match(codeRegex) || [];

                for (let i = 0; i < code.length; i++) {
                    text = text.replace(code[i], `||refinedCode${i}||`);
                }

                w.TS.format.formatWithOptions(text);
                text = this.doChange(text);

                for (let i = 0; i < code.length; i++) {
                    text = text.replace(`||refinedCode${i}||`, code[i]);
                }
                for (let i = 0; i < blocks.length; i++) {
                    text = text.replace(`||refinedBlock${i}||`, blocks[i]);
                }

                e.set(key, text);

                // on chat update, we need to disable their parsing logic
                if (parameters.path.startsWith("/api/chat.update")) {
                    e.set("parse", "default");
                }

                oldSend(e);
            };
            request.send = send.bind(request);
        }
    }
}
