import test from 'ava'

import inMemoryStore from './_inMemoryStore'

import store from '../src/store'

test.beforeEach( t => {
  t.context.store = store(inMemoryStore())
})

test('addRequest adds items to the end of the list', async t => {
  const { store } = t.context
  const channelId = 'my-channel-id'

  await store.addRequest(channelId, { some: 'data' })
  await store.addRequest(channelId, { other: 'info' })
  const requests = await store.listRequests(channelId)

  t.true(requests.length === 2)
  t.true(requests[0].some === 'data')
  t.true(requests[1].other === 'info')
})

test('addRequest adds items to the specified channel', async t => {
  const { store } = t.context

  await store.addRequest('my-channel', { some: 'data' })
  await store.addRequest('other-channel', { other: 'info' })

  const requests = await store.listRequests('my-channel')

  t.true(requests.length === 1)
  t.true(requests[0].some === 'data')
})

test('removeRequest removes an item from the list', async t => {
  const { store } = t.context
  const channelId = 'my-channel-id'

  await store.addRequest(channelId, { name: 1 })
  await store.addRequest(channelId, { name: 2 })
  await store.addRequest(channelId, { name: 3 })

  const requests = await store.listRequests(channelId)

  await store.removeRequest(requests[1])

  const requestsWithoutRemoved = await store.listRequests(channelId)

  t.deepEqual(requestsWithoutRemoved, [requests[0], requests[2]])
})

test('removeRequest removes an item from its channel', async t => {
  const { store } = t.context

  await store.addRequest('my-channel',    { name: 1 })
  await store.addRequest('other-channel', { name: 1 })

  const requests = await store.listRequests('my-channel')

  await store.removeRequest(requests[0])

  const requestsInMyChannel = await store.listRequests('my-channel')
  t.true(requestsInMyChannel.length === 0)

  const requestsInOtherChannel = await store.listRequests('other-channel')
  t.true(requestsInOtherChannel.length === 1)
})


test('didAskForModeratorship returns true when it was asked', async t => {
  const { store } = t.context

  await store.markAskedForModeratorship('my-channel', true)

  t.truthy(await store.didAskForModeratorship('my-channel'))
  t.falsy(await store.didAskForModeratorship('other-channel'))
})

test('didAskForModeratorship returns falsy when it wasn not asked', async t => {
  const { store } = t.context

  const didAsk = await store.didAskForModeratorship('my-channel')

  t.falsy(didAsk)
})
