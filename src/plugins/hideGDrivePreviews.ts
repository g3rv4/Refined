import { MessageTweakerPlugin } from './basePlugin.js';

export default class HideGDrivePreviews extends MessageTweakerPlugin {
    protected processXHRMessages(messages: any) {
        messages = messages.map(m => {
            if (m.files) {
                if (!m.text) {
                    // write the docs urls instead
                    const urls = m.files.filter(f => f.external_type === "gdrive" && f.url_private)
                        .map(f => `<${f.url_private}|${f.url_private}>`);
                    m.text = urls.join(', ');
                }
                m.files = m.files.filter(f => f.external_type !== "gdrive");
                if (!m.files.length) {
                    delete m.files;
                }
            }
            return m;
        });

        return messages;
    }

    protected processWSMessage(data: any) {
        const message = data.message ? data.message : data;
        if (message.files) {
            if (!message.text) {
                // write the docs urls instead
                const urls = message.files.filter(f => f.external_type === "gdrive" && f.url_private)
                    .map(f => `<${f.url_private}|${f.url_private}>`);
                message.text = urls.join(', ');
            }
            message.files = message.files.filter(f => f.external_type !== "gdrive");
            if (!message.files.length) {
                delete message.files;
            }
        }

        return data;
    }
}
