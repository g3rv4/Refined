// ugh, while Firefox doesn't implement dynamic module loading, this is going to make me sad
import HideUsers from './plugins/hideUsers.js';
import Hangouts from './plugins/hangouts.js';
import MarkdownLinks from './plugins/markdownLinks.js';
export default {
    hideUsers: HideUsers,
    hangouts: Hangouts,
    markdownLinks: MarkdownLinks,
}
// </sadness>