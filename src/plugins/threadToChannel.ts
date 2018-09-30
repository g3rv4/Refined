import Plugin, { InitResponse } from './plugin.js';

export default class ThreadToChannel extends Plugin {
    public init(): InitResponse {
        this.setUpObserver('#convo_tab',
            { attributes: false, childList: true, subtree: true },
            (nodes, _) => {
                const container = nodes.filter(n => n.className && n.className === 'reply_container_info')[0];
                if (container) {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    checkbox.checked = true;
                }
            });

        return {};
    }
}
