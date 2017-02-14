import _ from 'lodash'
import promisify from 'promisify-node'
import uuid from 'node-uuid'

export default (storage) => {
  const channels = promisify(storage.channels)

  const channelGet = (roomId) =>
    channels.get(roomId).then( (data) => data || {} )

  const addRequest = (roomId, request) =>
    updateRequests(roomId, (requests) => [
      ...requests,
      {
        uuid: uuid.v4(),
        roomId,
        ...request,
      }
    ])

  const listRequests = (roomId) =>
    channelGet(roomId)
      .then( ({requests}) => requests || [] )
      .catch(console.log)

  const removeRequest = (request) =>
    updateRequests(request.roomId, (requests) =>
      _.reject(requests, ({uuid}) => uuid == request.uuid)
    )

  const updateRequests = (roomId, cb) =>
    listRequests(roomId)
      .then( (requests) => channels.save({ id: roomId, requests: cb(requests) }) )
      .catch(console.log)

  const markAskedForModeratorship = (roomId, asked) =>
    channels.save({ id: roomId, askedForModeratorship: asked })

  const didAskForModeratorship = (roomId) =>
    channelGet(roomId).then( ({askedForModeratorship}) => askedForModeratorship )

  return {
    addRequest,
    didAskForModeratorship,
    listRequests,
    markAskedForModeratorship,
    removeRequest,
  }
}
