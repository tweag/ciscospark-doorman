import 'babel-polyfill'
import _ from 'lodash'

import controller from './controller'
import webui from './webui'
import actionsBuilder from './actions'
import storeBuilder from './store'
import matchRequest from './helpers/matchRequest'
import orText from './helpers/orText'

const bot = controller.spawn({})
const urls = webui.urls(process.env.PUBLIC_ADDRESS) // TODO: grab this from controller.config
const botEmail = process.env.BOT_EMAIL
const actions = actionsBuilder(controller.api, botEmail)
const store = storeBuilder(controller.storage)

const u = str =>
  str
    .split("\n")
    .map( (s) =>
      s.replace(/^\s+/, '')
    )
    .join("\n")
    .trim()

const md = str => ({
  markdown: u(str),
  text: 'if you do not send `text`, *sometimes* Botkit will not send the message'
})

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
  if (err) {
    console.log(err)
    throw err
  }

  controller.createWebhookEndpoints(webserver, bot, () => console.log('SPARK: Webhooks set up!'))

  webui.setupApp(webserver, actions, store, bot)
})

const api = controller.api

controller.on('bot_room_join', async (bot, message) => {
  console.log('bot_room_join', message)

  const welcomeText =
    "Hi! I'm Doorman. I can help you invite users by giving them a URL where they can request access to this room."

  let askedForModeratorship

  try {
    await actions.makeUserModerator(message.channel, { personEmail: botEmail })

    console.log('became moderator')
    bot.reply(message, u(`
      ${welcomeText}
      I took the liberty of making myself a moderator of this space so that I can add people to it.
      To invite people to this room, give them this URL:
      ${urls.roomInvitation(message.channel)}
    `))

    askedForModeratorship = false

  } catch (e) {

    console.log('could not become moderator')
    bot.reply(message, u(`
      ${welcomeText}
      Before we get started, you need to make me a moderator. The People menu is up there ↗️
    `))

    askedForModeratorship = true
  }

  await store.markAskedForModeratorship(message.channel, askedForModeratorship)
})


controller.on('memberships.updated', async (bot, message) => {
  console.log('memberships.updated', message)

  const { isModerator, personEmail } = message.original_message.data

  if (isModerator
    && personEmail == botEmail
    && await store.didAskForModeratorship(message.channel)) {

    bot.reply(message, u(`
      Wonderful! Thanks for making me a moderator. Now we can get started.
      To invite people to this room, give them this URL:
      ${urls.roomInvitation(message.channel)}
    `))

    // Remove the mark in case the bot gets removed and re-added
    store.markAskedForModeratorship(message.channel, null)
  }
})


controller.hears(['make me moderator'], 'direct_mention', async (bot, message) => {
  try {
    await actions.makeUserModerator(message.channel, { personId: message.original_message.personId })
    bot.reply(message, 'done')
  } catch (err) {
    console.log(err)
    bot.reply(message, 'Sorry... I was unable to make you moderator.')
  }
})

controller.hears(['make yourself moderator'], 'direct_mention', async (bot, message) => {
  try {
    await actions.makeUserModerator(message.channel, { personEmail: botEmail })
  } catch (err) {
    console.log(err)
    bot.reply(message, 'Sorry... I was unable to make myself moderator.')
  }
})


controller.hears(['step down'], 'direct_mention', async (bot, message) => {
  console.log('STEP DOWN', message)
  bot.reply(message, 'Stepping down')

  try {
    await actions.stepDownAsModerator(message.channel, botEmail)
  } catch (err) {
    bot.reply(message, 'Apparently, I am unable.')
  }
})

const displayHelp = (bot, message) => bot.reply(message, md(`
  Send people here to get an invitation: ${urls.roomInvitation(message.channel)}

  Things I can do:

  - **list** — list the pending requests to join this space
  - **accept** — accept a request to join this space
  - **deny** — deny a request to join this space
  - **help** — display this message
`))

controller.hears([/^$/, 'help'], 'direct_mention', displayHelp)

controller.hears(['list', 'pending', 'who', 'requests'], 'direct_mention', async (bot, message) => {
  console.log('LIST', message)

  const requests = await store.listRequests(message.channel)

  console.log('requests: ', requests)

  if (requests.length) {

    bot.reply(message, md(`
      Here are the people waiting for invitations:

      ${requestList(requests)}`
    ))

  } else {

    bot.reply(message, 'There are no pending requests')

  }
})

const acceptRequest = async (convoOrMessage, request) => {
  say(convoOrMessage, `Inviting ${request.name} to join this space`)
  actions.invite(request)
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
    console.log('FOUND REQUEST FOR NAME')
    acceptOrDenyActions[command](message, matched[0])
  } else if (matched.length > 1) {
    console.log('FOUND REQUEST FOR MULTIPLE NAMES')
    bot.reply(message, `Sorry, but "${name}" could be either ${orNames(matched)}. Can you be more specific?`)
  } else {
    console.log('NO REQUEST FOR NAME')
    bot.reply(message, `Sorry, but I couldn't find "${name}" in the list of pending invitation requests`)
  }
}

const askWho = (message, requests, command) => {
  bot.startConversation(message, (err, convo) => {

    const patterns = [
      {
        pattern: acceptOrDenyCommandMatcher,
        callback: (response, convo) => {
          console.log('ABORT AND RETRY ACCEPT/DENY')
          controller.trigger('direct_mention', [bot, response])

          convo.stop()
          convo.next()
        }
      },
      {
        pattern: /(\S+)\s+(.+)/,
        callback: (response, convo) => {
          console.log('MATCH', response.match)
          const name = response.match[2]

          acceptOrDenyBasedOnName(bot, message, requests, command, name)

          convo.stop()
          convo.next()
        },
      },
    ]

    console.log('PATTERNS', patterns)

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
  if (! await actions.anyOtherModerators(message.channel, botEmail)) return true

  const { isModerator } = await actions.findMembership(message.channel, {personEmail: message.user})

  if (!isModerator) bot.reply(message, 'Sorry, I only answer to moderators')

  return isModerator
}

const acceptCommands = ['accept', 'invite', 'allow']
const denyCommands = ['deny', 'reject', 'disallow']

const actualCommand = writtenCommand => {
  const command = writtenCommand.toLowerCase()
  if (_.includes(acceptCommands, command)) {
    return 'accept'
  } else if (_.includes(denyCommands, command)) {
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

const handleAcceptOrDeny = async (bot, message) => {
  console.log('ACCEPT/DENY', message)

  if (await requireModerator(bot, message)) {
    console.log('GOING THROUGH WITH IT')

    const requests = await store.listRequests(message.channel)

    console.log('REQUESTS', requests)

    if (requests.length === 0) {
      console.log('NO PENDING REQUESTS', requests)
      bot.reply(message, 'There are no pending requests')
      return
    }

    const { command, name } = parseAcceptOrDenyCommand(message)

    console.log('NAME', name)
    console.log('COMMAND', command)

    if (name) {
      acceptOrDenyBasedOnName(bot, message, requests, command, name)
    } else if (requests.length === 1) {
      console.log('ACCEPT/DENY ONLY REQUEST')
      acceptOrDenyActions[command](message, requests[0])
    } else {
      console.log('MULTIPLE REQUESTS / NO NAME')
      askWho(message, requests, command)
    }
  }
}

/*
  Matches commands for accepting/denying
*/
const regexpStr = `(${[...acceptCommands, ...denyCommands].join('|')})(\\s+(.+))?`
const acceptOrDenyCommandMatcher = new RegExp(regexpStr)

controller.hears([acceptOrDenyCommandMatcher], 'direct_mention', (...args) => handleAcceptOrDeny(...args).catch(console.log))


controller.on('direct_mention', displayHelp)
