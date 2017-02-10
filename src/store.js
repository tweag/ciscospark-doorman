export default (initialRequests = {}) => {
  const requests = initialRequests

  return {
    addRequest: (roomId, request) => {
      requests[roomId] = requests[roomId] || []
      requests[roomId].push(request)
    },

    listRequests: (roomId) => requests[roomId] || [],
  }
}
