import test from 'ava'

import unindent from '../../src/util/unindent'

test('removes surrounding whitespace for each line of a string', t => {
  const input = [
    '',
    '  ',
    '     something ',
    '  is indented  ',
    '  ',
    '  1',
    '',
    '  2',
    '  ',
    '',
    '  '
  ].join("\n")

  const expected = [
    'something',
    'is indented',
    '',
    '1',
    '',
    '2',
  ].join("\n")

  t.true( unindent(input) === expected )
})
