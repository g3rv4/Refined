import BasePlugin from "./basePlugin";

export default class Hangouts extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptXHR = true;
    }

    public static GenerateSettingsFromForm(current: any, newSettings: any) {
        if (newSettings.url) {
            return {
                enabled: true,
                url: newSettings.url
            };
        }
        return { enabled: false };
    }

    public interceptXHR(request, method, path, async) {
        if (this.settings.url && (path.startsWith("/api/chat.postMessage") || path.startsWith("/api/chat.update"))) {
            const oldSend = request.send.bind(request);
            const defaultUrl = this.settings.url;
            const send = e => {
                const w: any = window;
                const userIds = [w.TS.model.user.id];

                let text = e.get("text");
                const lMessage = text.toLowerCase();
                let match;

                if (lMessage.indexOf("hangout ") === 0) {
                    const name = text.substring(8);
                    let url;

                    const re = /<@([^>]+)>/g;
                    while (match = re.exec(name)) {
                        userIds.push(match[1]);
                    }

                    if (userIds.length > 1) {
                        const userNames = w.TS.model.members.filter(m => userIds.indexOf(m.id) !== -1)
                            .map(m => m.profile.display_name_normalized);
                        userNames.sort();
                        url = userNames.join("-");
                    } else {
                        // just use the text separated by hyphens
                        url = name.replace(" ", "-");
                    }

                    url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                    text = `hangout ${name}: ${defaultUrl.replace("$name$", url)}`;
                }

                e.set("text", text);
                oldSend(e);
            };
            request.send = send.bind(request);
        }
    }
}
