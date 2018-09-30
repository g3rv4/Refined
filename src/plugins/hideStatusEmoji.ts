import Plugin from './plugin.js';

export default class HideStatusEmoji extends Plugin {
    public getCSS() {
        return `
.c-custom_status, .message_current_status {
    display: none !important;
}`;
    }
}
