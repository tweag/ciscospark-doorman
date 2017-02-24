import reject from 'lodash/reject'
import uuid from 'node-uuid'
import promisify from 'promisify-node'

export default class {
  constructor(storage) {
    this.channels = promisify(storage.channels)
  }

  channelGet = roomId =>
    this.channels.get(roomId).then( data => data || {} )

  addRequest = (roomId, request) =>
    this.updateRequests(roomId, requests => [
      ...requests,
      {
        uuid: uuid.v4(),
        roomId,
        ...request,
      }
    ])

  listRequests = roomId =>
    this.channelGet(roomId)
      .then( ({requests}) => requests || [] )

  removeRequest = request =>
    this.updateRequests(request.roomId, requests =>
      reject(requests, ({uuid}) => uuid == request.uuid)
    )

  updateRequests = (roomId, cb) =>
    this.listRequests(roomId)
      .then( requests => this.channels.save({ id: roomId, requests: cb(requests) }) )

  markAskedForModeratorship = (roomId, asked) =>
    this.channels.save({ id: roomId, askedForModeratorship: asked })

  didAskForModeratorship = roomId =>
    this.channelGet(roomId).then( ({askedForModeratorship}) => askedForModeratorship )
}
