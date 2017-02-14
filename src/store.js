import uuid from 'node-uuid'
import _ from 'lodash'

export default (initialRequests = {}) => {
  const requests = {}

  const addRequest = (roomId, request) => {
    requests[roomId] = requests[roomId] || []
    request.roomId = roomId
    request.uuid = uuid.v4()
    requests[roomId].push(request)
  }

  const listRequests = (roomId) => requests[roomId] || []

  const removeRequest = (request) => {
    requests[request.roomId] = _.reject(requests[request.roomId], ({uuid}) => uuid == request.uuid)
  }

  Object.keys(initialRequests).forEach( (roomId) =>
    initialRequests[roomId].forEach( (request) =>
      addRequest(roomId, request)
    )
  )

  return { addRequest, listRequests, removeRequest }
}
