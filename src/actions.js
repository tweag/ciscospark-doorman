export default (api) => ({
  makeMyselfModerator: (membershipId) =>
    api.memberships.get(membershipId).then((membership) => {
      membership.isModerator = true
      return api.memberships.update(membership)
    })
  ,

  stepDownAsModerator:  ({ roomId }) =>
    api.memberships.list({ roomId, personEmail: botEmail, max: 1 })
      .then( ([membership, ..._]) =>
        api.memberships.remove(membership)
      )
  ,

  getRoom: (id) =>
    api.rooms.list({ id, max: 1 }).then( ([room, ..._]) => room )
  ,
})
