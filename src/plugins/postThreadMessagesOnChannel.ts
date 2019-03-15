import BasePlugin, { IXHRParameters } from "./basePlugin";
declare var $: any;

export default abstract class PostThreadMessagesOnChannel extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptWS = true;
        this.shouldInterceptXHR = true;
    }

    public async init(): Promise<void> {
        this.setUpObserver("#messages_container",
        { attributes: true, childList: true, subtree: true },
        (nodes, _) => {
            const messages = nodes.filter(n => n.className && n.classList.contains("c-virtual_list__item")
                && !n.classList.contains("refined-message")
                && n.querySelector(".c-message"));

            this.processMessages(messages);
        });

        // from time to time there are messages recreated in the DOM and an observer on #messages_container wasn't enough
        // (see https://github.com/g3rv4/Refined/issues/23). This makes the check every half a second
        setInterval(() => {
            // css selectors don't support :has yet... so let's use jquery
            let matching = $(".c-virtual_list__item:not(.refined-message):has(> .c-message)").toArray();
            if (!matching.length) {
                // check if some messages have the class but don't have the link
                matching = $(".c-virtual_list__item.refined-should-have-arrow:not(:has(.refined-expand-thread-link))").toArray();
                if (!matching.length) {
                    return;
                }

                this.processMessages(matching, true);
            }
            this.processMessages(matching);
        }, 500);
    }

    public interceptXHR(request, parameters: IXHRParameters) {
        if (parameters.path.startsWith("/api/conversations.history")) {
            parameters.path = parameters.path.replace("conversations.history", "conversations.view");
        }

        if (parameters.path.startsWith("/api/conversations.view") || parameters.path.startsWith("/api/conversations.replies")) {
            // remove ignore_replies from the request
            const oldSend = request.send.bind(request);
            const send = e => {
                e.delete("ignore_replies");
                oldSend(e);
            };
            request.send = send.bind(request);

            // make the response threaded messages broadcast
            let oldListener = _ => { };
            if (request.onreadystatechange) {
                oldListener = request.onreadystatechange.bind(request);
            }

            request.onreadystatechange = e => {
                if (request.readyState === 4) {
                    this.processConversations(request);
                }
                oldListener(e);
            };
        }
    }

    private processConversations(request) {
        let data = JSON.parse(request.responseText);

        if (data.ok) {
            if (data.history && data.history.messages) {
                data.history.messages = this.processXHRMessages(data.history.messages);
                data = data.history;
            } else if (data.messages) {
                data.messages = this.processXHRMessages(data.messages);
            }
            request.bindResponse(JSON.stringify(data));
        }
    }

    private processXHRMessages(messages) {
        for (const msg of messages.filter(m => m.type === "message" && !m.subtype && m.thread_ts && m.ts !== m.thread_ts)) {
            msg.subtype = "thread_broadcast";
        }
        return messages;
    }

    private processMessages(messages: any[], addArrow?: boolean) {
        if (addArrow === undefined) {
            addArrow = false;
        }
        for (const message of messages) {
            if (!addArrow && message.classList.contains("refined-message")) {
                continue;
            }
            const links = $('a[href*="archives"]', message);
            if (links.length) {
                const link = links[0].href;
                const match = /\/archives\/[a-zA-Z0-9]+\/p([0-9]+)(\?thread_ts=([0-9\.]+))?/.exec(link);
                let convo_id = match[1];
                if (match[3]) {
                    convo_id = match[3].replace(".", "");

                    // it's a threaded message. Reorder the elements
                    const messageBody = message.querySelector(".c-message__body");

                    if (!messageBody) {
                        continue;
                    }

                    const newThreadLink = document.createElement("a");
                    newThreadLink.classList.add("refined-expand-thread-link");
                    newThreadLink.onclick = e => {
                        const event = new Event("click", { bubbles: true });
                        const originalLink = newThreadLink.closest(".c-message__content").querySelector("a.c-message__broadcast_preamble_link");
                        originalLink.dispatchEvent(event);
                    };

                    if (messageBody.firstChild) {
                        messageBody.insertBefore(newThreadLink, messageBody.firstChild);
                    } else {
                        messageBody.appendChild(newThreadLink);
                    }

                    // add the thread icon
                    const img = document.createElement("img");
                    img.setAttribute("src", (window as any).refinedBaseUrl + "images/arrow.svg");
                    newThreadLink.appendChild(img);
                    message.classList.add("refined-should-have-arrow");
                }
                const elementsInThisConvoClass = `refined-conversation-${convo_id}`;
                message.classList.add(elementsInThisConvoClass);
                message.addEventListener("mouseenter", () => {
                    $(`.refined-message:not(.${elementsInThisConvoClass})`).removeClass("refined-conversation-hover");
                    $(`.${elementsInThisConvoClass}`).addClass("refined-conversation-hover");
                });
                message.addEventListener("mouseleave", () => {
                    $(`.${elementsInThisConvoClass}`).removeClass("refined-conversation-hover");
                });
            }
            message.classList.add("refined-message");
        }
    }

    public interceptWS(data: any) {
        if (data.type === "message") {
            if (data.thread_ts) {
                data.subtype = "thread_broadcast";
            } else if (data.subtype === "message_changed") {
                data.message = this.processXHRMessages([data.message])[0];
            }
        }
        return data;
    }

    public getCSS() {
        return `
.c-message_kit__labels--broadcast .c-message_kit__labels__label {
    display: none;
}

.c-message_kit__background--labels--broadcast {
    background-color: white;
}

.c-message__broadcast_footer {
    display: none;
}

.c-message__broadcast_preamble {
    display: none;
}

.c-message__body img {
    margin-right: 5px;
}

.c-message__broadcast_preamble_link {
    display: inline !important;
    margin-left: 0 !important;
}

.refined-conversation-hover {
    background: #f8f8f8 !important;
}`;
    }
}
