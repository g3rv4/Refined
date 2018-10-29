import BasePlugin from "./basePlugin";

export default class MoveSidebar extends BasePlugin {
    public getCSS() {
        return `
.client_channels_list_container {
    order: 1;
}`;
    }
}
