import BasePlugin from "./basePlugin";
declare var $: any;

export default class HideAllThreads extends BasePlugin {
    public async init() {
        const element = await this.getElement(() => {
            return $('div[role="listitem"]:has(.p-channel_sidebar__link--all-threads)').toArray()[0];
        });
        element.remove();

        const jumper = $('div[role="listitem"]:has(.p-channel_sidebar__jumper)').toArray()[0];
        if (jumper.nextSibling.getAttribute("role") === "presentation") {
            jumper.nextSibling.remove();
        }
    }
}
