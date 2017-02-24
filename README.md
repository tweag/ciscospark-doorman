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

        heroku apps:create my-doorman-bot

4. Add environment variables to the heroku app to match those in `.env`.
   e.g.

        heroku config:add PUBLIC_ADDRESS=https://my-doorman-bot.herokuapp.com

5. Add a Redis addon. The `Heroku Redis` is a good one.

6. Push to heroku

        git push heroku

7. Add your bot to your space. He'll tell you what to do from there.

## Development

### Work on the bot


1. [Create a new bot account](https://developer.ciscospark.com/add-bot.html) on Cisco Spark

2. Clone this repo

3. Install dependencies

        yarn install

4. Install Redis.
  If you're on a Mac, do `brew install redis`

5. Copy `.env` to `.env.local` and customize

        cp .env .env.local

5. Start the local development server

        npm start

6. Run ngrok (or something like it).

    Because Spark uses webhooks to talk to bots, you must run something like ngrok locally to expose your server to the web.
    We've included a script to do this for you (requires ngrok)

        npm run ngrok


### Work on the web UI

If you want to redesign the web UI, use these commands to start a server and watch the stylesheets directory for changes.

    yarn install
    npm run webui-dev

### Tests

Run the tests:

    npm test

Run the test watcher:

    npm run test-watch

