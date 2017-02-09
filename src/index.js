import 'babel-polyfill'
import controller from './controller'
import webui from './webui'
import actionsBuilder from './actions'
import storeBuilder from './store'

const bot = controller.spawn({})
const botEmail = process.env.BOT_EMAIL
const urls = webui.urls(process.env.PUBLIC_ADDRESS) // TODO: grab this from controller.config
const actions = actionsBuilder(controller.api)
const store = storeBuilder()

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

  bot.reply(message, 'Dont mind me... just assuming moderatorship...')

  actions.makeMyselfModerator(message.id)
    .then( () =>
      bot.reply(message, 'Done')
    )
    .catch( () =>
      bot.reply(message, 'Sorry... something went wrong. Try again or ask someone for help.')
    )
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

controller.hears(['help'], 'direct_mention', (bot, message) => {
  console.log('HELP', message)
  bot.reply(message, `Send people here to get an invitation: ${urls.roomInvitation(message.channel)}`)
})

controller.hears(['test'], 'direct_mention,direct_message', function (bot, message) {
  bot.startConversation(message, function (err, convo) {
    if (err) {
      console.log(err)
      throw err
    }
    convo.say('Hi!')
    convo.say('I am bot')
    convo.ask('What are you?', function (res, convo) {
      convo.say('You said ' + res.text)
      convo.next()
    })
  })
})

controller.on('self_message', function (bot, message) {
  console.log('Someone said', message)
  // a reply here could create recursion
  // bot.reply(message, 'You know who just said something? This guy.')
})

controller.on('direct_mention', function (bot, message) {
  bot.reply(message, 'You mentioned me.')
})

controller.on('direct_message', function (bot, message) {
  bot.reply(message, 'I got your private message.', (err, worker, message) => {
    if (err) {
      console.log(err)
      throw err
    }
  })
})
