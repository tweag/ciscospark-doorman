import 'babel-polyfill'
import _ from 'lodash'

import controller from './controller'
import webui from './webui'
import actionsBuilder from './actions'
import storeBuilder from './store'

const bot = controller.spawn({})
const urls = webui.urls(process.env.PUBLIC_ADDRESS) // TODO: grab this from controller.config
const botEmail = process.env.BOT_EMAIL
const actions = actionsBuilder(controller.api, botEmail)
const store = storeBuilder(controller.storage)

const undent = (str) => {
  const withoutInitialLines = str.replace(/\s*\n/, '')
  const indentation = withoutInitialLines.match(/^\s*/)[0]
  return withoutInitialLines
    .split(/\n/)
    .map( (s) => s.replace(indentation, '') )
    .join("\n")
    .trim()
}

const md = (str) => {
  const undented = undent(str)
  return {
    markdown: undented,
    text: undented, // if you don't send `text`, *sometimes* Botkit won't send the message
  }
}

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
  if (err) {
    console.log(err)
    throw err
  }

  controller.createWebhookEndpoints(webserver, bot, () => console.log('SPARK: Webhooks set up!'))

  webui.setupApp(webserver, actions, store, bot)
})

const api = controller.api

controller.on('bot_room_join', (bot, message) => {
  console.log('bot_room_join', message)

  const welcomeText =
    "Hi! I'm Doorman. I can help you invite users by giving them a URL where they can request access to this room."

  actions.makeUserModerator(message.channel, { personEmail: botEmail })
    .then( () => {
      console.log('became moderator')
      bot.reply(message, undent(`
        ${welcomeText}
        I took the liberty of making myself a moderator of this space so that I can add people to it.
        To invite people to this room, give them this URL:
        ${urls.roomInvitation(message.channel)}
      `))
      store.markAskedForModeratorship(message.channel, false)
    })
    .catch( (err) => {
      console.log('could not become moderator')
      bot.reply(message, undent(`
        ${welcomeText}
        Before we get started, you need to make me a moderator. The People menu is up there ↗️
      `))
      store.markAskedForModeratorship(message.channel, true)
    })
})


controller.on('memberships.updated', (bot, message) => {
  console.log('memberships.updated', message)

  const { isModerator, personEmail } = message.original_message.data

  if (isModerator && personEmail == botEmail) {

    store.didAskForModeratorship(message.channel).then( (asked) => {
      if (asked) {
        bot.reply(message, undent(`
          Wonderful! Thanks for making me a moderator. Now we can get started.
          To invite people to this room, give them this URL:
          ${urls.roomInvitation(message.channel)}
        `))
        store.markAskedForModeratorship(message.channel, null)
      }
    })
  }
})


controller.hears(['make me moderator'], 'direct_mention', (bot, message) => {
  actions.makeUserModerator(message.channel, { personId: message.original_message.personId })
    .then( () => bot.reply(message, 'done') )
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Sorry... I was unable to make you moderator.')
    })
})

controller.hears(['make yourself moderator'], 'direct_mention', (bot, message) => {
  actions.makeUserModerator(message.channel, { personEmail: botEmail })
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Sorry... I was unable to make myself moderator.')
    })
})


controller.hears(['step down'], 'direct_mention', (bot, message) => {
  console.log('STEP DOWN', message)
  bot.reply(message, 'Goodbye')

  actions.stepDownAsModerator(message.channel, botEmail)
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Apparently, I am unable.')
    })
})

const displayHelp = (bot, message) =>
  bot.reply(message, md(`
    Send people here to get an invitation: ${urls.roomInvitation(message.channel)}

    Things I can do:

    - list — list the pending requests to join this space
    - accept — accept a request to join this space
    - deny — deny a request to join this space
    - help — display this message
  `))

controller.hears([/^$/, 'help'], 'direct_mention', displayHelp)

controller.hears(['list', 'pending', 'who', 'requests'], 'direct_mention', (bot, message) => {
  console.log('LIST', message)

  store.listRequests(message.channel).then( (requests) => {
    console.log('requests: ', requests)

    if (requests.length) {

      bot.reply(message, md(`
        Here are the people waiting for invitations:

        ${requestList(requests)}
      `))

    } else {

      bot.reply(message, 'There are no pending requests')

    }
  })
})

const acceptRequest = (convoOrMessage, request) => {
  say(convoOrMessage, `Inviting ${request.name} to join this space`)
  actions.invite(request)
    .then( () => store.removeRequest(request) )
    .catch(console.log)
}

const denyRequest = (convoOrMessage, request) => {
  console.log('CONVO: ', convoOrMessage)
  say(convoOrMessage, `Denying ${request.name}`)
  store.removeRequest(request).catch(console.log)
}

const say = (convoOrMessage, text) => {
  if (convoOrMessage.say) {
    convoOrMessage.say(text)
  } else {
    bot.reply(convoOrMessage, text)
  }
}

const requestList = (requests) => requests.map( ({name}) => `1. ${name}` ).join("\n")

const acceptOrDenyActions = {
  accept: acceptRequest,
  deny: denyRequest,
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
          const request = matchRequest(response.match[2], requests)

          if (request) {
            acceptOrDenyActions[command](message, request)
          } else {
            console.log('did not understand', response)
            convo.say("Sorry, I didn't catch that. What do you want me to do?")
          }

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

const requireModerator = (bot, message) =>
  actions.findMembership(message.channel, {personEmail: message.user})
    .then( ({isModerator}) => {
      if (!isModerator) {
        bot.reply(message, 'Sorry, I only answer to moderators')
        return Promise.reject()
      }
    })

const acceptCommands = ['accept', 'invite', 'allow']
const denyCommands = ['deny', 'reject', 'disallow']

const actualCommand = (writtenCommand) => {
  const command = writtenCommand.toLowerCase()
  if (_.includes(acceptCommands, command)) {
    return 'accept'
  } else if (_.includes(denyCommands, command)) {
    return 'deny'
  } else {
    throw "Should never get here"
  }
}

const parseAcceptOrDenyCommand = (message) => ({
  command: actualCommand(message.match[1]),
  name: message.match[3],
})

const matchRequest = (name, requests) => _.find(requests, (request) => request.name.toLowerCase() == name.toLowerCase())

const handleAcceptOrDeny = (bot, message) => {
  console.log('ACCEPT/DENY', message)

  requireModerator(bot, message).then( () => {
    console.log('GOING THROUGH WITH IT')

    store.listRequests(message.channel).then( (requests) => {
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
        const request = matchRequest(name, requests)

        if (request) {
          console.log('FOUND REQUEST FOR NAME')
          acceptOrDenyActions[command](message, request)
        } else {
          console.log('NO REQUEST FOR NAME')
          bot.reply(message, `Sorry, but I couldn't find "${name}" in the list of pending invitation requests`)
        }
      } else if (requests.length === 1) {
        console.log('ACCEPT/DENY ONLY REQUEST')
        acceptOrDenyActions[command](message, requests[0])
      } else {
        console.log('MULTIPLE REQUESTS / NO NAME')
        askWho(message, requests, command)
      }
    }).catch(console.log)
  })
}

/*
  Matches commands for accepting/denying
*/
const regexpStr = `(${[...acceptCommands, ...denyCommands].join('|')})(\\s+(.+))?`
const acceptOrDenyCommandMatcher = new RegExp(regexpStr)

controller.hears([acceptOrDenyCommandMatcher], 'direct_mention', handleAcceptOrDeny)

controller.on('direct_mention', displayHelp)
