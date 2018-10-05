import BasePlugin, { InitResponse } from "./basePlugin.js";

export default class ThreadToChannel extends BasePlugin {
    public async init(): Promise<void> {
        this.setUpObserver("#convo_tab",
            { attributes: false, childList: true, subtree: true },
            (nodes, _) => {
                const container = nodes.filter(n => n.className && n.className === "reply_container_info")[0];
                if (container) {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    checkbox.checked = true;
                }
            });
    }
}
