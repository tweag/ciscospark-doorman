import _ from 'lodash'
import promisify from 'promisify-node'
import uuid from 'node-uuid'

export default (storage) => {
  const channels = promisify(storage.channels)

  const addRequest = (roomId, request) => {
    request.roomId = roomId
    request.uuid = uuid.v4()

    updateRequests(roomId, (requests) => [...requests, request])
  }

  const listRequests = (roomId) =>
    channels.get(roomId)
      .then( (data = {}) => data.requests || [] )
      .catch(console.log)

  const removeRequest = (request) => {
    updateRequests(request.roomId, (requests) =>
      _.reject(requests, ({uuid}) => uuid == request.uuid)
    )
  }

  const updateRequests = (roomId, cb) => {
    listRequests(roomId)
      .then( (requests) => channels.save({ id: roomId, requests: cb(requests) }) )
      .catch(console.log)
  }

  return { addRequest, listRequests, removeRequest }
}
