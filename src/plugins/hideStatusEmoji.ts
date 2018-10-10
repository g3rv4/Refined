import BasePlugin from "./basePlugin";

export default class HideStatusEmoji extends BasePlugin {
    public getCSS() {
        return `
.c-custom_status, .message_current_status {
    display: none !important;
}`;
    }
}
