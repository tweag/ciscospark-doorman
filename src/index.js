import 'babel-polyfill'
import controller from './controller'
import webui from './webui'
import actionsBuilder from './actions'
import storeBuilder from './store'

const bot = controller.spawn({})
const urls = webui.urls(process.env.PUBLIC_ADDRESS) // TODO: grab this from controller.config
const actions = actionsBuilder(controller.api, process.env.BOT_EMAIL)
const store = storeBuilder({
  'Y2lzY29zcGFyazovL3VzL1JPT00vZTA3ZGUyMzAtZWE0OC0xMWU2LWIwYjMtOTE4MWNlNjMzYTVk': [
    { name: 'Alice', email: 'alice-doorman-dev@mailinator.com', title: 'CTO',  city: 'Albuquerque' },
    { name: 'Bob',   email: 'bob-doorman-dev@mailinator.com',   title: 'Peon', city: 'Baltimore'   },
  ]
})

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
  if (err) {
    console.log(err)
    throw err
  }

  controller.createWebhookEndpoints(webserver, bot, () =>
    console.log('SPARK: Webhooks set up!')
  )

  webui.setupApp(webserver, actions, store, bot)
})

const api = controller.api

controller.on('bot_room_join', (bot, message) => {
  console.log('bot_room_join', message)

  actions.makeMyselfModerator(message.id)
    .then( () => {
      console.log('became moderator')
      bot.reply(message, [
        "Hi! I'm Doorman. I can help you invite users by giving them a URL where they can request access to this room.",
        'I took the liberty of making myself a moderator of this space so that I can add people to it.',
        'To invite people to this room, give them this URL:',
        urls.roomInvitation(message.channel),
      ].join("\n"))
    })
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Sorry... I was unable to make myself moderator. Try again or get some help.')
    })
})


controller.hears(['leave'], 'direct_mention', (bot, message) => {
  console.log('STEP DOWN', message)
  bot.reply(message, 'Goodbye')

  actions.stepDownAsModerator(message.original_message)
    .then( () =>
      bot.reply(message, 'Ok. I have stepped down.')
    )
    .catch( (err) => {
      console.log(err)
      bot.reply(message, 'Apparently, I am unable. Try again or ask someone for help.')
    })
})

const displayHelp = (bot, message) => {
  bot.reply(message, [
    `Send people here to get an invitation: ${urls.roomInvitation(message.channel)}`,
    'Commands I accept:',
    '    list, pending, who - list the pending requests to join this space',
    '    accept - accept a request to join this space',
    '    deny - deny a request to join this space',
    '    leave - tell Doorman to leave the space',
    '    help - display this message',
  ].join("\n"))
}

controller.hears([/^$/, 'help'], 'direct_mention', displayHelp)

controller.hears(['list', 'pending', 'who'], 'direct_mention', (bot, message) => {
  console.log('LIST', message)
  const requests = store.listRequests(message.channel)

  if (requests.length) {

    bot.reply(message, [
      'Here are the people waiting for invitations:',
      requestList(requests),
    ].join("\n"))

  } else {

    bot.reply(message, 'There are no pending requests')

  }
})

const acceptRequest = (convoOrMessage, request) => {
  say(convoOrMessage, `Accepting ${request.name}`)
}

const denyRequest = (convoOrMessage, request) => {
  console.log('CONVO: ', convoOrMessage)
  say(convoOrMessage, `Denying ${request.name}`)
  // store.removeRequest(request)
}

const say = (convoOrMessage, text) => {
  if (convoOrMessage.say) {
    convoOrMessage.say(text)
  } else {
    bot.reply(convoOrMessage, text)
  }
}

const requestList = (requests) => requests.map(
  ({name}, i) => `${i+1}. ${name}`
).join("\n")

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
          console.log("did not understand", response)
          convo.say("I didn't catch that")
          convo.repeat()
          convo.next()
        },
      },
    ]

    convo.ask(
      `Who?\n${requestList(requests)}`,
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

  const requests = store.listRequests(message.channel)

  if (requests.length === 0) {
    bot.reply(message, "There are no pending requests")
  } else if (requests.length === 1) {
    actionToTake(message, requests[0])
  } else {
    askWho(message, requests, actionToTake)
  }
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
