import u from './unindent'

export default str => ({
  markdown: u(str),
  text: 'if you do not send `text`, *sometimes* Botkit will not send the message'
})
