import 'babel-polyfill'
import express from 'express'
import webui from './webui'
import storeBuilder from './store'

const store = storeBuilder({ channels: {} })

const dummyActions = {
  getRoom: () => Promise.resolve({ title: "Movers & Shakers" })
}

const dummyBot = {
  say: () => {}
}

const app = express()

webui.setupApp(app, dummyActions, store, dummyBot)

app.get('/', (req, res) => res.send(`
  <a href="/space/dummySpaceId-1234567890">
    Dummy Form
  </a>
`))

app.listen(4000, () => console.log('Dummy web UI listening http://localhost:4000'))
