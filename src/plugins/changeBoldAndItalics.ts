import baseMessageModifierPlugin from "./baseMessageModifierPlugin";

export default class ChangeBoldAndItalics extends baseMessageModifierPlugin {
    protected doChange(t: string): string {
        t = t.replace(/(^|\s)\*([^\*]+)\*($|\s)/g, (_, before, text, after) => `${before}_${text}_${after}`);
        t = t.replace(/(^|\s)\*\*([^\*]+)\*\*($|\s)/g, (_, before, text, after) => `${before}*${text}*${after}`);
        return t;
    }
    protected undoChange(t: string): string {
        t = t.replace(/(^|\s)\*([^\*]+)\*($|\s)/g, (_, before, text, after) => `${before}**${text}**${after}`);
        t = t.replace(/(^|\s)_([^_]+)_($|\s)/g, (_, before, text, after) => `${before}*${text}*${after}`);
        return t;
    }
}
