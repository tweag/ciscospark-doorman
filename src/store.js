export default () => {
  const requests = {}

  return {
    addRequest: (roomId, request) => {
      requests[roomId] = requests[roomId] || []
      requests[roomId].push(request)
    }
  }
}
