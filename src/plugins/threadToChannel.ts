/// <reference path="./basePlugin.ts" />

namespace Plugins {
    export class ThreadToChannel extends BasePlugin {
        private observe(nodes: any[], observer: MutationObserver) {
            const containers = nodes.filter(n => n.className && n.className === "reply_container_info");
            for (const container of containers) {
                const checkbox = container.querySelector('input[type="checkbox"]');
                checkbox.checked = true;
            }
        }

        public async init(): Promise<void> {
            this.setUpObserver("#convo_tab",
                { attributes: false, childList: true, subtree: true },
                this.observe);

            this.setUpObserver("#messages_container",
                { attributes: false, childList: true, subtree: true },
                this.observe);
        }
    }
}
