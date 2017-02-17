import _ from 'lodash'

// 'Bob   Barker   ' => ' bob barker '
// adds space to ends so that we can use indexOf without 'ana' matching 'dana'
const normalizeName = name => ` ${name} `.toLowerCase().replace(/\s+/g, ' ')

const nameContains = (input, requestName) => requestName.indexOf(input) !== -1

const namesMatch = (input, requestName) =>
  nameContains(normalizeName(input), normalizeName(requestName))

const appendNumber = (requests) =>
  requests.map( ({...data}, i) => ({...data, number: i + 1}) )

export default (name, requests) =>
  _.filter(appendNumber(requests), request => namesMatch(name, request.name))
