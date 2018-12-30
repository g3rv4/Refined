import BasePlugin from "./basePlugin";

export default abstract class PostThreadMessagesOnChannel extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptWS = true;
    }

    public interceptWS(data: any) {
        if (data.type === "message" && data.thread_ts) {
            data.subtype = "thread_broadcast";
        }
        return data;
    }
}
