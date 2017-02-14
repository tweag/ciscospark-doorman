export default (api) => {
  const makeMemberModerator = (membershipId, isModerator) =>
    api.memberships.get(membershipId).then((membership) => {
      membership.isModerator = isModerator
      return api.memberships.update(membership)
    })

  const makeUserModerator = (roomId, membershipParams) =>
    api.memberships.list({...membershipParams, roomId, max: 1})
      .then( ([{id}]) => makeMemberModerator(id, true) )

  const stepDownAsModerator = (roomId, personEmail) =>
    api.memberships.list({...membershipParams, roomId, max: 1})
      .then( ([{id}]) => makeMemberModerator(id, false) )

  const leaveRoom = (roomId, personEmail) =>
    api.memberships.list({ roomId, personEmail, max: 1 })
      .then( ([membership, ..._]) =>
        api.memberships.remove(membership)
      )

  const getRoom = (id) =>
    api.rooms.list({ id, max: 1 }).then( ([room, ..._]) => room )

  const invite = ({roomId, email}) =>
    api.memberships.create({ roomId, personEmail: email })

  return {
    getRoom,
    invite,
    leaveRoom,
    makeMemberModerator,
    makeUserModerator,
    stepDownAsModerator,
  }
}
