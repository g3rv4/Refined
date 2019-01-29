import BasePlugin from "./basePlugin";

export default class ThreadToChannel extends BasePlugin {
    private observe(query: string) {
        this.setUpObserver(query,
            { attributes: false, childList: true, subtree: true },
            (nodes, _) => {
                const containers = nodes.filter(n => n.className && (n.className === "c-virtual_list__item" || n.className === "reply_container_info"));
                for (const container of containers) {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            });
    }

    public async init(): Promise<void> {
        this.observe("#convo_tab");
        this.observe("#messages_container");
    }
}
