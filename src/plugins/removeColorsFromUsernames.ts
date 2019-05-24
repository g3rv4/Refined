import BasePlugin from "./basePlugin";

export default class RemoveColorsFromUsernames extends BasePlugin {
    public getCSS() {
        return `
.c-message__sender_link {
    color: #1d1c1d !important;
    }`;
    }
}
