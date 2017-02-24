import 'babel-polyfill'
import includes from 'lodash/includes'

import controller from './controller'
import webui from './webui'
import Spark from './spark'
import Store from './store'
import matchRequest from './util/match-request'
import orText from './util/or-text'
import u from './util/unindent'
import md from './util/markdown-message'

const bot = controller.spawn({})
const urls = webui.urls(process.env.PUBLIC_ADDRESS)
const botEmail = process.env.BOT_EMAIL
const spark = new Spark(controller.api)
const store = new Store(controller.storage)

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
  if (err) {
    console.log(err)
    throw err
  }

  controller.createWebhookEndpoints(webserver, bot, () => console.log('SPARK: Webhooks set up!'))

  webui.setupApp(webserver, spark, store, bot)
})

const api = controller.api

controller.on('bot_space_join', async (bot, message) => {
  const welcomeText =
    "Hi! I'm Doorman. I can help you invite users by giving them a URL where they can request access to this space."

  let askedForModeratorship

  try {
    await spark.makeUserModerator(message.channel, { personEmail: botEmail })

    bot.reply(message, u(`
      ${welcomeText}
      I took the liberty of maimoderator of this space so that I can add people to it.
      To invite people to this space, give them this URL:
      ${urls.roomInvitation(message.channel)}
    `))

    askedForModeratorship = false

  } catch (err) {
    console.log(err)

    bot.reply(message, u(`
      ${welcomeText}
      Before we get started, you need to make me a moderator. The People menu is up there ↗️
    `))

    askedForModeratorship = true
  }

  await store.markAskedForModeratorship(message.channel, askedForModeratorship)
})


controller.on('memberships.updated', async (bot, message) => {
  const { isModerator, personEmail } = message.original_message.data

  if (isModerator
    && personEmail == botEmail
    && await store.didAskForModeratorship(message.channel)) {

    bot.reply(message, u(`
      Wonderful! Thanks for making me a moderator. Now we can get started.
      To invite people to this space, give them this URL:
      ${urls.roomInvitation(message.channel)}
    `))

    // Remove the mark in case the bot gets removed and re-added
    store.markAskedForModeratorship(message.channel, null)
  }
})


if (process.env.ALLOW_DEBUG_COMMANDS === '1') {
  controller.hears(['make me moderator'], 'direct_mention', async (bot, message) => {
    try {
      await spark.makeUserModerator(message.channel, { personId: message.original_message.personId })
      bot.reply(message, 'done')
    } catch (err) {
      console.log(err)
      bot.reply(message, 'Sorry... I was unable to make you moderator.')
    }
  })
}

const displayHelp = (bot, message) => bot.reply(message, md(`
  Send people here to get an invitation: ${urls.roomInvitation(message.channel)}

  Things I can do:

  - **list** — list the pending requests to join this space
  - **accept** — accept a request to join this space
  - **deny** — deny a request to join this space
  - **leave** — tell Doorman to leave the space
  - **help** — display this message
`))

controller.hears([/^$/, 'help'], 'direct_mention', displayHelp)

controller.hears(['list', 'pending', 'who', 'requests'], 'direct_mention', async (bot, message) => {
  const requests = await store.listRequests(message.channel)

  if (requests.length) {

    bot.reply(message, md(`
      Here are the people waiting for invitations:

      ${requestList(requests)}`
    ))

  } else {

    bot.reply(message, 'There are no pending requests')

  }
})


controller.hears(['leave'], 'direct_mention', async (bot, message) => {
  if (await requireModerator(bot, message)) {
    bot.reply(message, 'Goodbye')

    spark.leaveRoom(message.channel, botEmail)
      .catch( (err) => {
        console.log(err)
        bot.reply(message, `Apparently, I am unable. Try again or ask someone for help. \n\n${err.stack}`)
      })
  }
})



const acceptRequest = async (convoOrMessage, request) => {
  say(convoOrMessage, `Inviting ${request.name} to join this space`)
  spark.invite(request)
  store.removeRequest(request)
}

const denyRequest = (convoOrMessage, request) => {
  say(convoOrMessage, `Denying ${request.name}`)
  store.removeRequest(request)
}

const say = (convoOrMessage, text) => {
  if (convoOrMessage.say) {
    convoOrMessage.say(text)
  } else {
    bot.reply(convoOrMessage, text)
  }
}

const requestList = requests => requests.map( ({name}) => `1. ${name}` ).join("\n")

const acceptOrDenyActions = {
  accept: acceptRequest,
  deny: denyRequest,
}

const acceptOrDenyBasedOnName = (bot, message, requests, command, name) => {
  const matched = matchRequest(name, requests)

  if (matched.length === 1) {
    acceptOrDenyActions[command](message, matched[0])
  } else if (matched.length > 1) {
    bot.reply(message, `Sorry, but "${name}" could be either ${orNames(matched)}. Can you be more specific?`)
  } else {
    bot.reply(message, `Sorry, but I couldn't find "${name}" in the list of pending invitation requests`)
  }
}

const askWho = (message, requests, command) => {
  bot.startConversation(message, (err, convo) => {

    const patterns = [
      {
        pattern: acceptOrDenyCommandMatcher,
        callback: (response, convo) => {
          controller.trigger('direct_mention', [bot, response])

          convo.stop()
          convo.next()
        }
      },
      {
        pattern: /(\S+)\s+(.+)/,
        callback: (response, convo) => {
          const name = response.match[2]

          acceptOrDenyBasedOnName(bot, message, requests, command, name)

          convo.stop()
          convo.next()
        },
      },
    ]

    convo.ask(
      md(`
        Who?

        ${requestList(requests)}
      `),
      patterns
    )
  })
}

const requireModerator = async (bot, message) => {
  // if there are no other moderators, anyone is allowed to use Doorman
  if (! await spark.anyOtherModerators(message.channel, botEmail)) return true

  const { isModerator } = await spark.findMembership(message.channel, {personEmail: message.user})

  if (!isModerator) bot.reply(message, 'Sorry, I only answer to moderators')

  return isModerator
}

const acceptCommands = ['accept', 'invite', 'allow']
const denyCommands = ['deny', 'reject', 'disallow']

const actualCommand = writtenCommand => {
  const command = writtenCommand.toLowerCase()
  if (includes(acceptCommands, command)) {
    return 'accept'
  } else if (includes(denyCommands, command)) {
    return 'deny'
  } else {
    throw "Should never get here"
  }
}

const parseAcceptOrDenyCommand = message => ({
  command: actualCommand(message.match[1]),
  name: message.match[3],
})

const orNames = (requests) => orText(requests.map(({name, number}) => `"${name}" (#${number})`))

/*
  Matches commands for accepting/denying
*/
const regexpStr = `(${[...acceptCommands, ...denyCommands].join('|')})(\\s+(.+))?`
const acceptOrDenyCommandMatcher = new RegExp(regexpStr)

controller.hears([acceptOrDenyCommandMatcher], 'direct_mention', async (bot, message) => {
  try {
    if (await requireModerator(bot, message)) {
      const requests = await store.listRequests(message.channel)

      if (requests.length === 0) {
        bot.reply(message, 'There are no pending requests')
        return
      }

      const { command, name } = parseAcceptOrDenyCommand(message)

      if (name) {
        acceptOrDenyBasedOnName(bot, message, requests, command, name)
      } else if (requests.length === 1) {
        acceptOrDenyActions[command](message, requests[0])
      } else {
        askWho(message, requests, command)
      }
    }
  } catch (err) {
    console.log(err)
  }
})


controller.on('direct_mention', displayHelp)
