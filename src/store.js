export default (initialRequests = {}) => {
  const requests = {}

  const addRequest = (roomId, request) => {
    requests[roomId] = requests[roomId] || []
    request.roomId = roomId
    requests[roomId].push(request)
  }

  const listRequests = (roomId) => requests[roomId] || []

  const removeRequest = (roomId, request) => {
  }

  Object.keys(initialRequests).forEach( (roomId) =>
    initialRequests[roomId].forEach( (request) =>
      addRequest(roomId, request)
    )
  )

  return { addRequest, listRequests, removeRequest }
}
