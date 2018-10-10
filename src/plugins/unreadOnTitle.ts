import BasePlugin from "./basePlugin";

export default class UnreadOnTitle extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptWS = true;
        this.shouldInterceptReact = true;
    }

    public async init(): Promise<void> {
        this.setUpObserver("title",
            { attributes: true, childList: true, subtree: true },
            () => {
                if (document.title.startsWith("*") || document.title.startsWith("!")) {
                    document.title = document.title.substring(2);
                }
            });
    }

    public interceptWS(data: any) {
        if (data.type === "message") {
            const slackModel = this.getSlackModel();
            if (data.channel === slackModel.active_channel_id && data.user !== slackModel.user.id) {
                let currentUnread = this.getLocalValue("currentUnread");

                // this is a bit weird... they always send a message. If it"s a message inside a thread
                // they then send the message_repied event, and if it"s a threaded message also sent to the channel
                // then they send a message_changed event without an edited property
                // what are you saying? that this is a hack? yes, the whole thing is
                if (!data.subtype) {
                    // it"s a message...
                    if (!data.thread_ts) {
                        // it"s not in a thread!
                        currentUnread++;
                    }
                } else if (data.subtype === "message_changed") {
                    // message_changed, we still don"t know much about it
                    if (!data.message.edited) {
                        // when a threaded message is sent to the chat, there"s no edited property. Are there any
                        // other instances when this happens? I have no freaking idea :)
                        currentUnread++;
                    }
                }

                this.setLocalValue("currentUnread", currentUnread);

                const title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, "");
                if (currentUnread) {
                    document.title = `(${currentUnread}) ${title}`;
                } else {
                    document.title = title;
                }
            }
        }
        return data;
    }

    public interceptReact(displayName, props) {
        // make sure we unset the title marker when we have to
        if (displayName === "UnreadBanner") {
            if (!props.hasUnreads && props.channelId) {
                this.setLocalValue("currentUnread", 0);
                document.title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, "");
            }
        }

        return props;
    }
}
