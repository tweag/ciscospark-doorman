import flow from 'lodash/fp/flow'
import filter from 'lodash/fp/filter'
import reject from 'lodash/fp/reject'

export default class {
  constructor(api) {
    this.memberships = api.memberships
    this.rooms = api.rooms
  }

  makeMemberModerator = async (membershipId, isModerator) => {
    const membership = await this.memberships.get(membershipId)
    await this.memberships.update({ ...membership, isModerator })
  }

  findMembership = (roomId, userParams) =>
    this.memberships.list({...userParams, roomId})
      .then( ([membership]) => membership )

  makeUserModerator = async (roomId, userParams) => {
    const {id} = await this.findMembership(roomId, userParams)
    await this.makeMemberModerator(id, true)
  }

  leaveRoom = async (roomId, personEmail) => {
    const membership = await this.findMembership(roomId, {personEmail})
    this.memberships.remove(membership)
  }

  getRoom = async id => {
    const [room] = await this.rooms.list({ id, max: 1 })
    return room
  }

  invite = ({roomId, email}) =>
    this.memberships.create({ roomId, personEmail: email })

  findOtherModerators = async (roomId, personEmail) => {
    // use spread to make it an actual Array
    const [...memberships] = await this.memberships.list({roomId})
    return flow(
      filter({ isModerator: true }),
      reject({ personEmail }),
    )(memberships)
  }

  anyOtherModerators = (...args) =>
    this.findOtherModerators(...args).then( otherMods => !!otherMods.length )
}
