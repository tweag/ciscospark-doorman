import test from 'ava'

import matchRequest from '../../src/util/matchRequest'

test.beforeEach( t => {
  t.context.requests = [
    { name: 'Alice Aston' },
    { name: 'Bob Barker' },
    { name: 'Carl Crawford' },
    { name: 'Bob Davidson' },
  ]
})

const matchRequestsWithName = (t, input, expected) => {
  const matches = matchRequest(input, t.context.requests)
  const actual = matches.map(r => r.name)
  t.deepEqual(actual, expected)
}

const cloneObject = ({...data}) => ({...data})

test('matches exact string', matchRequestsWithName,
  'Alice Aston', ['Alice Aston']
)

test('matches same string but different case', matchRequestsWithName,
  'bob barker', ['Bob Barker']
)

test('matches same string with whitespace', matchRequestsWithName,
  '  Bob Barker  ', ['Bob Barker']
)

test('matches one of the names', matchRequestsWithName,
  'carl', ['Carl Crawford']
)

test('matches a few of the names of the names', matchRequestsWithName,
  'bob', ['Bob Barker', 'Bob Davidson']
)

test('returns nothing when it cannot find the request', matchRequestsWithName,
  'Eric Erlich', []
)

test('matches number - exact string', matchRequestsWithName,
  '2', ['Bob Barker']
)

test('matches number - with octothorpe', matchRequestsWithName,
  '#2', ['Bob Barker']
)

test('matches number - with period', matchRequestsWithName,
  '2.', ['Bob Barker']
)

test('matches number - with whitespace and other non-alpha chars', matchRequestsWithName,
  '!@$*)#$% 2 )(&*$', ['Bob Barker']
)

test('appends the number of the request so we can use it in other places', t => {
  const matches = matchRequest('Bob', t.context.requests)
  const namesAndNumbers = matches.map( ({name, number}) => [name, number] )
  t.deepEqual( namesAndNumbers, [ ['Bob Barker', 2] , ['Bob Davidson', 4] ] )
})

test('does not modify the requests', t => {
  const origalRequests = t.context.requests.map(cloneObject)

  matchRequest('Bob', t.context.requests)

  t.deepEqual( origalRequests, t.context.requests)
})
