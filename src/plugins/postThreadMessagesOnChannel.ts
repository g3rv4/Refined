import BasePlugin from "./basePlugin";
declare var $: any;

export default abstract class PostThreadMessagesOnChannel extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptWS = true;
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

        // deal with the messages that are primed on first load
        const interval = setInterval(() => {
            // css selectors don't support :has yet... so let's use jquery
            const matching = $(".c-virtual_list__item:not(.refined):has(> .c-message)").toArray();
            if (!matching.length) {
                return;
            }
            clearInterval(interval);
            this.processMessages(matching);
        }, 500);
    }

    private processMessages(messages: any[]) {
        for (const message of messages) {
            const links = $('a[href*="archives"]', message);
            if (links.length) {
                const link = links[0].href;
                const match = /\/archives\/[a-zA-Z0-9]+\/p([0-9]+)(\?thread_ts=([0-9\.]+))?/.exec(link);
                let convo_id = match[1];
                if (match[3]) {
                    convo_id = match[3].replace(".", "");

                    // it's a threaded message. Reorder the elements
                    const threadLink = message.querySelector("a.c-message__broadcast_preamble_link");
                    const messageBody = message.querySelector(".c-message__body");

                    messageBody.insertBefore(threadLink, messageBody.firstChild);

                    // add the thread icon
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("viewBox", "0 -22 512 511");
                    svg.setAttribute("width", "15px");
                    svg.setAttribute("height", "15px");
                    svg.setAttribute("style", "fill: #1d1c1d");

                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", "M0 233.82L212.777.5v139.203h45.238C398.29 139.703 512 253.414 512 393.688v73.77l-20.094-22.02c-68.316-74.852-164.98-117.5-266.324-117.5h-12.805V467.14zm0 0");
                    svg.appendChild(path);

                    // remove everything from threadLink
                    while (threadLink.firstChild) {
                        threadLink.removeChild(threadLink.firstChild);
                    }

                    threadLink.appendChild(svg);
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
        if (data.type === "message" && data.thread_ts) {
            data.subtype = "thread_broadcast";
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

.c-message__broadcast_preamble_link {
    display: inline !important;
    margin-left: 0 !important;
}

.refined-conversation-hover {
    background: #f8f8f8 !important;
}`;
    }
}
