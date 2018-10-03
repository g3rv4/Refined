import BasePlugin from "./basePlugin.js";

export default class HideStatusEmoji extends BasePlugin {
    public getCSS() {
        return `
.c-custom_status, .message_current_status {
    display: none !important;
}`;
    }
}
