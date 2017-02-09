import express from 'express'

const router = express.Router()

const urls = (publicAddress) => {
  const url = (path) => `${publicAddress}${path}`

  return {
    roomInvitation: (roomId) => url(`space/${roomId}`)
  }
}

const setupApp = (app, actions, store, bot) => {
  app.set('views', 'src/templates')
  app.set('view engine', 'pug')

  router.get('/', (req, res) => {
    res.render('index')
  })

  router.get('/space/:roomId', (req, res) => {
    const { params: { roomId } } = req

    actions.getRoom(roomId).then( (room) =>
      res.render('index', { room: room })
    )
  })

  router.post('/space/:roomId', (req, res) => {
    const { params: { roomId } } = req

    store.addRequest(roomId, req.body)

    bot.say({
      text: 'You got a request',
      channel: roomId
    })

    actions.getRoom(roomId).then( (room) =>
      res.render('thank-you', { room: room })
    )
  })

  app.use('/', router)
}

export default { setupApp, urls }
