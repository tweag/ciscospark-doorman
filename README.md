# 🎩 Doorman Bot for Cisco Spark

Doorman is a bot that can manage invitations to a private space.
Invite him to a space and he'll give you a URL that you can give to people who might want to join.
Add the URL to a forum, email chain, Twitter, or whatever.

Doorman will ask you to review any guests before letting them join your space (or not).

## Try it out

The official Doorman bot is doorman@sparkbot.io.
Add him to your space and play around.

## Deploying your own Doorman bot

Here are instructions for deploying on Heroku, but this can be adapted to any host.

1. [Create a new bot account](https://developer.ciscospark.com/add-bot.html) on Cisco Spark
2. Clone this repo
3. Create a new app on heroku

        heroku apps:create my-doorman-bot`

4. Add environment variables to the heroku app to match those in `.env`.
   e.g.

        heroku config:add PUBLIC_ADDRESS=https://my-doorman-bot.herokuapp.com

5. Push to heroku

        git push heroku

6. Add your bot to your space. He'll tell you what to do from there.

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
