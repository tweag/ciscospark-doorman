export default api => {
  const makeMemberModerator = (membershipId, isModerator) =>
    api.memberships.get(membershipId).then( membership =>
      api.memberships.update({ ...membership, isModerator })
    )

  const findMembership = (roomId, userParams) =>
    api.memberships.list({...userParams, roomId})
      .then( ([membership, ...rest]) => {
        if (rest.length) {
          console.log("found other memberships: ", rest)
          throw new Error(`Found other memberships with the same params: ${JSON.stringify(rest)}`)
        }

        return membership
      })

  const makeUserModerator = (roomId, userParams) =>
    findMembership(roomId, userParams).then( ({id}) => makeMemberModerator(id, true) )

  const stepDownAsModerator = (roomId, personEmail) =>
    findMembership(roomId, {personEmail}).then( ({id}) => makeMemberModerator(id, false) )

  const getRoom = id =>
    api.rooms.list({ id, max: 1 }).then( ([room, ..._]) => room )

  const invite = ({roomId, email}) =>
    api.memberships.create({ roomId, personEmail: email })

  return {
    findMembership,
    getRoom,
    invite,
    makeUserModerator,
    stepDownAsModerator,
  }
}
