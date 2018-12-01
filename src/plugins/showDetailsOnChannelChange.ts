import BasePlugin from "./basePlugin";

export default class ShowDetailsOnChannelChange extends BasePlugin {
    public async init(): Promise<void> {
        this.setUpObserver("#client_header",
            { childList: true, attributes: false, subtree: true },
            (nodes, _) => {
                const currentChannel = this.getSlackModel().active_cid;
                const previousChannel = this.getLocalValue("channel");

                if (currentChannel === previousChannel) {
                    return;
                }

                this.setLocalValue("channel", currentChannel);

                const linkToClick = document.querySelector("#details_toggle:not(.active)") as HTMLAnchorElement;
                if (linkToClick) {
                    linkToClick.click();
                }
            });
    }
}
