import test from 'ava'

import orText from '../../src/util/or-text'

const expectOrText = (t, input, expected) =>
  t.true( orText(input) === expected )

test('2 items', expectOrText, ['a', 'b'], 'a or b')
test('3 items', expectOrText, ['a', 'b', 'c'], 'a, b or c')
test('4 items', expectOrText, ['a', 'b', 'c', 'd'], 'a, b, c or d')
