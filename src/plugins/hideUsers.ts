import { InitResponse, MessageTweakerPlugin } from './basePlugin.js';

export default class HideUsers extends MessageTweakerPlugin {
    private _hidden_ids: string[];

    private get hidden_ids(): string[] {
        if (!this._hidden_ids) {
            const teamId = this.getTeamId();
            this._hidden_ids = this.settings.hidden_ids.filter(i => i.startsWith('*.') || i.startsWith(`${teamId}.`))
                .map(i => i.split('.').pop());
        }
        return this._hidden_ids;
    }

    public init(): InitResponse {
        this.observeThings();

        return {
            interceptXHR: true,
            interceptWS: true
        };
    }

    static ProcessExtensionMessage(request: any, pluginName: string, sender: chrome.runtime.MessageSender) {
        // this runs on the background thread
        chrome.storage.sync.get(['pluginSettings'], res => {
            const pluginSettings = JSON.parse(res.pluginSettings || '{}');
            const hideUsersSettings = pluginSettings[pluginName];

            if (request.type === 'mute') {
                if (hideUsersSettings.hidden_ids.indexOf(request.userId) === -1) {
                    hideUsersSettings.hidden_ids.push(request.userId);
                }
            } else if (request.type === 'unmute' && request.userIds && request.userIds.length) {
                // unmute exact users (those that are qualified by a team id)
                hideUsersSettings.hidden_ids = hideUsersSettings.hidden_ids.filter(i => request.userIds.indexOf(i) === -1);

                // unmute generic mutes (from v1)
                const genericUserIds = request.userIds.map(i => '*.' + i.split('.').pop());
                hideUsersSettings.hidden_ids = hideUsersSettings.hidden_ids.filter(i => genericUserIds.indexOf(i) === -1);
            }

            var json = JSON.stringify(pluginSettings);
            chrome.storage.sync.set({
                'pluginSettings': json
            }, () => {
                chrome.tabs.reload(sender.tab.id);
            });
        })
    }

    protected processXHRMessages(messages) {
        return messages.filter(m => this.hidden_ids.indexOf(m.bot_id) === -1 && this.hidden_ids.indexOf(m.user) === -1);
    }

    protected processWSMessage(message) {
        if (this.hidden_ids.indexOf(message.user) !== -1 || this.hidden_ids.indexOf(message.bot_id) !== -1) {
            message = {};
        }
        return message;
    }

    private observeThings() {
        this.addMuteActionsToPopup();
        this.addUnmuteActionToPreferences();
    }

    private addUnmuteActionToPreferences() {
        this.setUpObserver("body",
            { childList: true, attributes: false, subtree: false },
            (nodes, _) => {
                const modal = nodes.filter(r => r.id === 'fs_modal')[0];
                if (modal) {
                    // add an observer to the contents_container element
                    const hidden_ids = this.hidden_ids;
                    const target = modal.querySelector('.contents');
                    if (target) {
                        const contentObserver = new MutationObserver(async (records, _) => {
                            const afterElement = records.map(r => [...r.addedNodes] as any)
                                .reduce((a, b) => a.concat(b))
                                .filter(r => r.id === 'prefs_inline_media')[0];

                            if (afterElement && hidden_ids.length) {
                                const form = document.createElement('form');

                                const h2 = document.createElement('h2');
                                h2.className = 'large_top_margin inline_block';
                                h2.textContent = 'Muted users';
                                form.appendChild(h2);

                                const p = document.createElement('p');
                                form.appendChild(p);

                                let users = this.getGlobalValue('users');
                                const slackModel = this.getSlackModel();
                                if (!users) {
                                    let response = await fetch('https://slack.com/api/users.list?token=' + slackModel.api_token);
                                    let json = await response.json();
                                    users = json.members.filter(u => !u.deleted);
                                    this.setGlobalValue('users', users);
                                }

                                let bots = this.getGlobalValue('bots');
                                if (!bots) {
                                    let response = await fetch('https://slack.com/api/bots.list?token=' + slackModel.api_token);
                                    let json = await response.json();
                                    bots = json.bots.filter(b => !b.deleted);
                                    this.setGlobalValue('bots', bots);
                                }

                                const userIds = users.map(m => m.id);
                                const botIds = bots.map(b => b.id);
                                const teamId = this.getTeamId();

                                hidden_ids.forEach(userId => {
                                    let muted = undefined;
                                    if (userId[0] === 'U') {
                                        // it's a user
                                        if (userIds.indexOf(userId) !== -1) {
                                            muted = users.filter(m => m.id == userId)[0];
                                        }
                                    } else if (userId[0] === 'B') {
                                        // it's a bot
                                        if (botIds.indexOf(userId) !== -1) {
                                            muted = bots.filter(m => m.id == userId)[0];
                                        }
                                    }
                                    if (muted) {
                                        // the muted user is in this workspace!
                                        const current = document.createElement('label');
                                        current.className = 'checkbox';

                                        const input = document.createElement('input');
                                        input.value = "1";
                                        input.name = `${teamId}.${muted.id}`;
                                        input.type = 'checkbox';
                                        current.appendChild(input);

                                        const span = document.createElement('span');
                                        span.innerText = muted.profile ? muted.profile.real_name : muted.name;
                                        current.appendChild(span);

                                        p.appendChild(current);
                                    }
                                });

                                if (p.childElementCount > 0) {
                                    const btn = document.createElement('button');
                                    btn.type = 'submit';
                                    btn.className = 'btn btn_outline ladda-button';
                                    btn.innerText = 'Unmute the selected users';
                                    form.appendChild(btn);

                                    form.appendChild(document.createElement('hr'));

                                    form.onsubmit = e => {
                                        e.preventDefault();

                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const userIds = [];
                                        formData.forEach(function (_, key) {
                                            userIds.push(key);
                                        });

                                        if (userIds.length) {
                                            window.postMessage({
                                                type: `taut.${this.name}.unmute`,
                                                userIds
                                            }, '*');
                                        }
                                    }
                                    target.insertBefore(form, afterElement);
                                }
                            }
                        });
                        contentObserver.observe(target, { childList: true, attributes: false, subtree: false });
                    }
                }
            });
    }

    private addMuteActionsToPopup() {
        // listen to the click on a username so that we know who we're talking about
        this.setUpObserver(".client_main_container",
            { childList: true, attributes: false, subtree: true },
            (nodes, _) => {
                const headers = nodes.map(e => {
                    if (e && e.querySelectorAll) {
                        const res = e.querySelectorAll('.c-message__sender_link');
                        if (res.length) {
                            return [...res];
                        }
                    }
                })
                    .filter(e => e)
                    .reduce((a, b) => a.concat(b), []);

                const teamId = this.getSlackModel().team.id;
                headers.forEach(h => {
                    if (!h.dataset.taut) {
                        h.dataset.taut = "1";
                        h.onclick = e => {
                            const userId = e.target.href.split('/').pop();
                            this.setLocalValue('last_clicked', `${teamId}.${userId}`);
                        }
                    }
                })
            });

        // add the mute action to users
        this.setUpObserver("#client-ui",
            { childList: true, attributes: false, subtree: false },
            (nodes, _) => {
                const menu = nodes.filter(n => n.id === 'menu')[0];
                const lastClicked = this.getLocalValue('last_clicked');

                if (menu && lastClicked && !lastClicked.endsWith(`.${this.getSlackModel().user.id}`)) {
                    const li: any = document.createElement('li');
                    const a = document.createElement('a');
                    a.innerText = "Mute";
                    a.onclick = _ => {
                        const userId = lastClicked;
                        window.postMessage({
                            type: `taut.${this.name}.mute`,
                            userId
                        }, '*');
                    }
                    li.appendChild(a);

                    const items = menu.querySelector('#menu_items');
                    const firstDivider = items.querySelector('.divider');
                    items.insertBefore(li, firstDivider);
                    this.setLocalValue('last_clicked', undefined);
                }
            });

        // add the mute action to bots
        this.setUpObserver("body",
            { childList: true, attributes: false, subtree: false },
            (nodes, _) => {
                const reactModal = nodes.filter(n => n.classList && n.classList.contains('ReactModalPortal'))[0];
                if (reactModal) {
                    const div = document.createElement('div');
                    div.className = 'c-menu_item__li';

                    const btn = document.createElement('button');
                    btn.onclick = _ => {
                        const userId = this.getLocalValue('last_clicked');
                        window.postMessage({
                            type: `taut.${this.name}.mute`,
                            userId
                        }, '*');
                    };
                    btn.onmouseenter = e => {
                        document.querySelectorAll('.c-menu_item__button--highlighted').forEach(e => e.classList.remove('c-menu_item__button--highlighted'));
                        (e.target as HTMLButtonElement).classList.add('c-menu_item__button--highlighted');
                    }
                    btn.onmouseleave = e => {
                        (e.target as HTMLButtonElement).classList.remove('c-menu_item__button--highlighted');
                    }
                    div.appendChild(btn);
                    btn.className = 'c-button-unstyled c-menu_item__button';

                    const div2 = document.createElement('div');
                    btn.appendChild(div2);
                    div2.className = 'c-menu_item__label';
                    div2.innerText = 'Mute';

                    const items = reactModal.querySelector('.c-menu__items');
                    if (items) {
                        const secondDivider = items.querySelectorAll('.c-menu_separator__li')[1];
                        items.insertBefore(div, secondDivider)
                    }
                }
            }
        )
    }
}
