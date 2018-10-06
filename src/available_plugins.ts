/// <reference path="./plugins/basePlugin.ts"/>
/// <reference path="./plugins/hideUsers.ts"/>
/// <reference path="./plugins/hangouts.ts"/>
/// <reference path="./plugins/markdownLinks.ts"/>
/// <reference path="./plugins/unreadOnTitle.ts"/>
/// <reference path="./plugins/threadToChannel.ts"/>
/// <reference path="./plugins/maintainThreadToChannel.ts"/>
/// <reference path="./plugins/moveReactions.ts"/>
/// <reference path="./plugins/hideStatusEmoji.ts"/>
/// <reference path="./plugins/hideUrlPreviews.ts"/>
/// <reference path="./plugins/hideGDrivePreviews.ts"/>
/// <reference path="./plugins/doNotOpenLinksOnApp.ts"/>

namespace Plugins {
    export class AvailablePlugins {
        private static plugins;

        public static get() {
            if (!this.plugins) {
                this.plugins = {
                    hideUsers: HideUsers,
                    hangouts: Hangouts,
                    markdownLinks: MarkdownLinks,
                    unreadOnTitle: UnreadOnTitle,
                    threadToChannel: ThreadToChannel,
                    maintainThreadToChannel: MaintainThreadToChannel,
                    moveReactions: MoveReactions,
                    hideStatusEmoji: HideStatusEmoji,
                    hideUrlPreviews: HideUrlPreviews,
                    hideGDrivePreviews: HideGDrivePreviews,
                    doNotOpenLinksOnApp: DoNotOpenLinksOnApp,
                };
            }
            return this.plugins;
        }
    }
}
