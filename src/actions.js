export default (api) => {
  const makeMemberModerator = (membershipId, isModerator) =>
    api.memberships.get(membershipId).then( (membership) =>
      api.memberships.update({ ...membership, isModerator })
    )

  const findMembership = (roomId, userParams) =>
    api.memberships.list({...userParams, roomId, max: 1}).then( ([membership]) => membership )

  const makeUserModerator = (roomId, userParams) =>
    findMembership(roomId, userParams).then( ({id}) => makeMemberModerator(id, true) )

  const stepDownAsModerator = (roomId, personEmail) =>
    findMembership(roomId, {personEmail}).then( ({id}) => makeMemberModerator(id, false) )

  const leaveRoom = (roomId, personEmail) =>
    findMembership(roomId, {personEmail}).then( (membership) => api.memberships.remove(membership) )

  const getRoom = (id) =>
    api.rooms.list({ id, max: 1 }).then( ([room, ..._]) => room )

  const invite = ({roomId, email}) =>
    api.memberships.create({ roomId, personEmail: email })

  return {
    findMembership,
    getRoom,
    invite,
    leaveRoom,
    makeMemberModerator,
    makeUserModerator,
    stepDownAsModerator,
  }
}
