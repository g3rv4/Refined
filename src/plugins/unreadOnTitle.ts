import BaseMessageCounterPlugin from "./baseMessageCounterPlugin";

export default class UnreadOnTitle extends BaseMessageCounterPlugin {
    public async init(): Promise<void> {
        this.setUpObserver("title",
            { attributes: true, childList: true, subtree: true },
            () => {
                if (document.title.startsWith("*") || document.title.startsWith("!")) {
                    document.title = document.title.substring(2);
                }
            });
    }

    protected unreadChanged() {
        const currentUnread = this.getLocalValue("currentUnread");
        const title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, "");
        if (currentUnread) {
            document.title = `(${currentUnread}) ${title}`;
        } else {
            document.title = title;
        }
    }
}
