# Refined :unicorn:

An extension to improve my Slack experience. You can find it for [Chrome](https://chrome.google.com/webstore/detail/refined-a-tool-for-slack/mgicdolhkaeefgmbhlohfjoafacijbfh) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/refined-a-tool-for-slack/). Find instructions to install it on Opera [here](https://refined.chat/opera).

# This extension NO LONGER WORKS

I'm developing new versions in private... if you're curious why, [read my blogpost about it](https://g3rv4.com/2019/07/bye-bye-refined). If you want to fork and continue working on it, make sure you start your work on commit 5da4bd1b6206b5f6d303bae15f8c6f2e4bf1c3ff (since the last commit disables a bunch of things to explain people that the extension no longer works).

## Features

Check all the features [on its website](https://refined.chat) :)

## Build from source

You need to have nodejs and npm installed. Once you do, just cloning the repo and running

```
npm install && npm run build
```

will generate:

* A `dist/chrome-opera` folder. You can load it unpacked [on Chrome](https://developer.chrome.com/extensions/getstarted#manifest) or [Opera](https://dev.opera.com/extensions/basics/#step-4-testing-your-extension).
* A `dist/ff` folder. You can [load it temporarily on Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox).