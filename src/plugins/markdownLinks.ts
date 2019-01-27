import baseMessageModifierPlugin from "./baseMessageModifierPlugin";

export default class MarkdownLinks extends baseMessageModifierPlugin {
    protected doChange(t: string): string {
        return t.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
    }
    protected undoChange(t: string): string {
        return t.replace(/<(?!!)([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
    }
}
