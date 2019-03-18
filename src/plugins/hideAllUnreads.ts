import BasePlugin from "./basePlugin";
declare var $: any;

export default class HideAllUnreads extends BasePlugin {
    public async init() {
        const element = await this.getElement(() => {
            return $('div[role="listitem"]:has(.p-channel_sidebar__link--all-unreads)').toArray()[0];
        });
        element.remove();
    }
}
