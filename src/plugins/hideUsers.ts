import Plugin from './plugin.js';

export default class HideUsers extends Plugin {
    public init(wsPlugins: Plugin[], xhrPlugins: Plugin[]): void {
        wsPlugins.push(this);
        xhrPlugins.push(this);
    }

    private filterMessages(messages) {
        return messages.filter(m => this.settings.hidden_ids.indexOf(m.bot_id) === -1 && this.settings.hidden_ids.indexOf(m.user) === -1);
    }

    private processConversations(request) {
        const data = JSON.parse(request.responseText);

        if (data.ok) {
            if (data.history && data.history.messages) {
                data.history.messages = this.filterMessages(data.history.messages);
            } else if (data.messages) {
                data.messages = this.filterMessages(data.messages);
            }
            request.bindResponse(JSON.stringify(data));
        }
    }

    public interceptXHR(request, method, path, async) {
        let oldListener = _ => { };
        if (request.onreadystatechange) {
            oldListener = request.onreadystatechange.bind(this);
        }

        if (path === '/api/conversations.view' || path.startsWith('/api/conversations.history')) {
            request.onreadystatechange = e => {
                if (request.readyState == 4) {
                    this.processConversations(request);
                }
                oldListener(e);
            }
        }
    }

    public processWebSocketData(data: any) {
        if (data.type === "message") {
            if (this.settings.hidden_ids.indexOf(data.user) !== -1 || this.settings.hidden_ids.indexOf(data.bot_id) !== -1) {
                data = {};
            }
        }
        return data;
    }
}