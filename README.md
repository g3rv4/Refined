# Taut :unicorn:

An extension to improve my Slack experience. You can find it for [Chrome](https://chrome.google.com/webstore/detail/taut-a-tool-for-slack/mgicdolhkaeefgmbhlohfjoafacijbfh), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/taut-a-tool-for-slack/) and [Opera](https://addons.opera.com/en/extensions/details/taut-a-tool-for-slack/).

## Features

Check all the features [on its website](https://taut.rocks) :)

## Build from source

You need to have nodejs and npm installed. Once you do, just cloning the repo and running

```
npm install && npm run build
```

will generate:

* A `dist/chrome-opera` folder. You can load it unpacked [on Chrome](https://developer.chrome.com/extensions/getstarted#manifest) or [Opera](https://dev.opera.com/extensions/basics/#step-4-testing-your-extension).
* A `dist/ff` folder. You can [load it temporarily on Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox).

## Changelog

### 2.0.2

* Fix post to channel on the "All threads" view.

### 2.0.1

* Add plugin to avoid opening Slack links on the app.

### 2.0.0

* It's a major rewrite! all the features are independent plugins (so that users have moar control over what's enabled). This allows users to disable a feature and absolutely killing it.

### 1.3.8

* Nicer mute and unmute!

### 1.3.7

* Add ability to use links on the topics :) thanks [HerrFolgreich](https://github.com/HerrFolgreich)!

### 1.3.6

* Make it easier to mute users

### 1.3.5

* Link to [taut.rocks](https://taut.rocks)!

### 1.3.4

* Switch from webpack to grunt.
* Don't increment the counter of unread messages on own messages.

### 1.3.3

* Make it compatible with Firefox.

### 1.3.2

* Unbreak the popup.

### 1.3.1

* Renamed it to Taut - a tool for Slack. Because I'm a liar.

### 1.3 - The last rename! I swear

* Rename it to Taut.
* Add notice and ask people to acknowledge the risks of using this extension.
* Only appear enabled on a slack workspace.
* Move the background-only logic to background.ts and the content script logic to content_script.ts

### 1.2.9

* Fix message edit when mentioning a team.

### 1.2.8

* Fix the hangout url when naming people.

### 1.2.7

* Fix the markdown links on message edit.

### 1.2.6

* Fix the counter when people talk on threads (that is... don't show an increase on a threaded message).

### 1.2.5

* Fix the counter on the title when the tab is not focused.

### 1.2.4

* Add ability to show the number of unread messages on the title.

### 1.2.3

* Fix a case when a channel was renamed. This got in the middle of the redirection.

### 1.2.2

* Rename it to BitterSweet

### 1.2.1 - Last public edition

* Bots were making it past the filter :facepalm:

### 1.2

* Remove the emoji and status from threads as well
* Enable hangout creation on threads
* Make "send response to #channel" sticky

### 1.1.5 (let's not talk about 1.1.4)

* Fix 1.1.4
* Change the name

### 1.1.3

* Hide the emoji of people with a status
* Fix the messages with links when displayed on a thread

### 1.1.2

* Fix when editing messages with markdown links
* Add ability to show all the previews

### 1.1.1

* Real markdown links!

### 1.1

* Fake Markdown links! (fake as... only people with the extension see them as links)

### 1.0.1

* Fix on ajax interceptions that don't have an `onreadystatechange` handler

### 1.0

* Creating hangouts
* Filtering users
* Defaulting to threads on channel
* Hiding reactions between other people
* Hiding emoji status
* Disable GDrive previews
* Moving reactions to the right