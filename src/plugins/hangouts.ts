import Plugin from './plugin.js';

export default class Hangouts extends Plugin {
    public init(wsPlugins: Plugin[], xhrPlugins: Plugin[]): void {
        xhrPlugins.push(this);
    }

    public interceptXHR(request, method, path, async) {
        if (this.settings.url && (path.startsWith('/api/chat.postMessage') || path.startsWith('/api/chat.update'))) {
            const oldSend = request.send.bind(request);
            const defaultUrl = this.settings.url;
            request.send = function (e) {
                const w: any = window;
                const userIds = [w.TS.model.user.id];

                let text = e.get('text');
                let lMessage = text.toLowerCase();
                let match;

                if (lMessage.indexOf("hangout ") === 0) {
                    var name = text.substring(8);
                    var url;

                    while (match = /<@([^>]+)>/g.exec(name)) {
                        userIds.push(match[1]);
                    }

                    if (userIds.length > 1) {
                        const userNames = w.TS.model.members.filter(m => userIds.indexOf(m.id) != -1)
                            .map(m => m.profile.display_name_normalized);
                        userNames.sort();
                        url = userNames.join('-');
                    } else {
                        // just use the text separated by hyphens
                        url = name.replace(' ', '-');
                    }

                    url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                    text = `hangout ${name}: ${defaultUrl.replace('$name$', url)}`;
                }

                e.set('text', text);
                oldSend(e);
            }.bind(request);
        }
    }
}