import 'babel-polyfill'
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



controller.hears(['leave'], 'direct_mention', (bot, message) => {
  console.log('LEAVE', message)
  bot.reply(message, 'Goodbye')

  actions.leaveRoom(message.channel, botEmail)
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Apparently, I am unable. Try again or ask someone for help.')
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
    - leave — tell Doorman to leave the space
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
}

const denyRequest = (convoOrMessage, request) => {
  console.log('CONVO: ', convoOrMessage)
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

const requestList = (requests) => requests.map( ({name}) => `1. ${name}` ).join("\n")

const askWho = (message, requests, actionToTake) => {
  bot.startConversation(message, (err, convo) => {
    const patterns = [
      ...requests.map( (request) => ({
        pattern: request.name,
        callback: (response, convo) => {
          actionToTake(convo, request)
          convo.next()
        }
      })),

      {
        pattern: /.*/,
        callback: (response, convo) => {
          console.log('did not understand', response)
          convo.say("I didn't catch that")
          convo.repeat()
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

const acceptOrDenyAction = {
  accept: acceptRequest,
  deny: denyRequest,
}

controller.hears(['accept', 'deny'], 'direct_mention', (bot, message) => {
  console.log('ACCEPT/DENY', message)

  const actionToTake = acceptOrDenyAction[message.match[0]]

  store.listRequests(message.channel).then( (requests) => {
    if (requests.length === 0) {
      bot.reply(message, "There are no pending requests")
    } else if (requests.length === 1) {
      actionToTake(message, requests[0])
    } else {
      askWho(message, requests, actionToTake)
    }
  })
})


controller.on('direct_mention', displayHelp)

// controller.on('direct_message', function (bot, message) {
//   bot.reply(message, 'I got your private message.', (err, worker, message) => {
//     if (err) {
//       console.log(err)
//       throw err
//     }
//   })
// })
