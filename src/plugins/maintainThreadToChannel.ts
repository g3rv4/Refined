import BasePlugin, { InitResponse } from './basePlugin.js';

export default class MaintainThreadToChannel extends BasePlugin {
    public init(): InitResponse {
        return { interceptXHR: true };
    }

    public interceptXHR(request, method, path, async) {
        if (path.startsWith('/api/chat.postMessage') || path.startsWith('/api/chat.update')) {
            const oldSend = request.send.bind(request);
            request.send = function (e) {
                if (e.get('reply_broadcast') === "true") {
                    [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                        (el as any).checked = true;
                    });
                }
                oldSend(e);
            }.bind(request);
        }
    };
}
