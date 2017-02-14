import { sparkbot } from 'botkit'
import redisStorage from 'botkit-storage-redis'

const controller = sparkbot({
  debug: true,
  log: true,
  public_address: process.env.PUBLIC_ADDRESS,
  ciscospark_access_token: process.env.ACCESS_TOKEN,
  studio_token: process.env.STUDIO_TOKEN,
  storage: redisStorage(process.env.REDIS_URL),
})

export default controller
