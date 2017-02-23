import flow from 'lodash/fp/flow'
import filter from 'lodash/fp/filter'
import reject from 'lodash/fp/reject'

export default api => {
  const makeMemberModerator = async (membershipId, isModerator) => {
    const membership = await api.memberships.get(membershipId)
    await api.memberships.update({ ...membership, isModerator })
  }

  const findMembership = async (roomId, userParams) => {
    const [membership, ...rest] = await api.memberships.list({...userParams, roomId})

    if (rest.length) {
      console.log("found other memberships: ", rest)
      throw new Error(`Found other memberships with the same params: ${JSON.stringify(rest)}`)
    }

    return membership
  }

  const makeUserModerator = async (roomId, userParams) => {
    const {id} = await findMembership(roomId, userParams)
    await makeMemberModerator(id, true)
  }

  const stepDownAsModerator = async (roomId, personEmail) => {
    const {id} = await findMembership(roomId, {personEmail})
    await makeMemberModerator(id, false)
  }

  const leaveRoom = (roomId, personEmail) =>
    findMembership(roomId, {personEmail}).then( (membership) => api.memberships.remove(membership) )

  const getRoom = async id => {
    const [room] = await api.rooms.list({ id, max: 1 })
    return room
  }

  const invite = ({roomId, email}) =>
    api.memberships.create({ roomId, personEmail: email })

  const findOtherModerators = async (roomId, personEmail) => {
    // use spread to make it an actual Array
    const [...memberships] = await api.memberships.list({roomId})
    return flow(
      filter({ isModerator: true }),
      reject({ personEmail }),
    )(memberships)
  }

  const anyOtherModerators = (...args) =>
    findOtherModerators(...args).then( otherMods => !!otherMods.length )

  return {
    findMembership,
    getRoom,
    invite,
    leaveRoom,

    anyOtherModerators,
    makeUserModerator,
    stepDownAsModerator,
  }
}
