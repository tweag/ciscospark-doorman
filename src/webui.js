import express from 'express'
import bodyParser from 'body-parser'

const router = express.Router()

const urls = publicAddress => {
  const url = path => `${publicAddress}${path}`

  return {
    roomInvitation: roomId => url(`space/${roomId}`)
  }
}

const setupApp = (app, spark, store, bot) => {
  app.use(bodyParser.urlencoded())
  app.set('views', 'src/templates')
  app.set('view engine', 'pug')
  app.use('/static', express.static('public'))

  router.get('/space/:roomId', (req, res) => {
    const { params: { roomId } } = req

    spark.getRoom(roomId).then( room =>
      res.render('index', { room: room })
    )
  })

  router.post('/space/:roomId', (req, res) => {
    const { params: { roomId } } = req

    const membershipRequest = req.body
    store.addRequest(roomId, membershipRequest)

    const { name, title, city, email } = membershipRequest

    bot.say({
      markdown: `**${name}** (${title}, ${email}) from ${city} requests to join this space. Mention me with **accept** or **deny**`,
      channel: roomId
    })

    res.render('thank-you')
  })

  app.use('/', router)
}

export default { setupApp, urls }
