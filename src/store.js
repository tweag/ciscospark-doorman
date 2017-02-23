import reject from 'lodash/reject'
import uuid from 'node-uuid'
import promisify from 'promisify-node'

export default storage => {
  const channels = promisify(storage.channels)

  const channelGet = roomId =>
    channels.get(roomId).then( data => data || {} )

  const addRequest = (roomId, request) =>
    updateRequests(roomId, requests => [
      ...requests,
      {
        uuid: uuid.v4(),
        roomId,
        ...request,
      }
    ])

  const listRequests = roomId =>
    channelGet(roomId)
      .then( ({requests}) => requests || [] )

  const removeRequest = request =>
    updateRequests(request.roomId, requests =>
      reject(requests, ({uuid}) => uuid == request.uuid)
    )

  const updateRequests = (roomId, cb) =>
    listRequests(roomId)
      .then( requests => channels.save({ id: roomId, requests: cb(requests) }) )

  const markAskedForModeratorship = (roomId, asked) =>
    channels.save({ id: roomId, askedForModeratorship: asked })

  const didAskForModeratorship = roomId =>
    channelGet(roomId).then( ({askedForModeratorship}) => askedForModeratorship )

  return {
    addRequest,
    listRequests,
    removeRequest,

    didAskForModeratorship,
    markAskedForModeratorship,
  }
}
