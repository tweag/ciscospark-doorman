# Doorman Bot

## Development

### WebUI

```
git clone promptworks/botkit-ciscospark
git clone promptworks/ciscospark-doorman
co ciscospark-doorman
yarn install
bower install
npm run webui-dev
```

### Strange things we had to do in `package.json`

- `npm rebuild node-sass` because of a bug in Yarn
- put dev dependencies in production, mostly because Heroku can't compile otherwise
