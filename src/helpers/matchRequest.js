import _ from 'lodash'

// 'Bob   Barker   ' => ' bob barker '
// adds space to ends so that we can use indexOf without 'ana' matching 'dana'
const normalizeName = name => ` ${name} `.toLowerCase().replace(/\s+/g, ' ')

const nameContains = (input, requestName) => requestName.indexOf(input) !== -1

const namesMatch = (input, requestName) =>
  nameContains(normalizeName(input), normalizeName(requestName))

const appendNumber = (requests) =>
  requests.map( ({...data}, i) => ({...data, number: i + 1}) )

const parseNumber = (input) => {
  const normalized = input.replace(/([\s]|[^a-zA-Z0-9])/g, '')
  return normalized.match(/^\d+$/) && parseInt(normalized)
}

export default (input, requests) => {
  const number = parseNumber(input)
  return _.filter(appendNumber(requests), request => number === request.number || namesMatch(input, request.name))
}
