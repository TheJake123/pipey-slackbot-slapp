'use strict'

const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const Database = require('./database')
const PDClient = require('./PDClient')
const BeepBoop = require('beepboop')
const EventHandler = require('./eventhandler')

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000
var db = new Database(
			  process.env.DB_HOST,
			  process.env.DB_PORT || 3306,
			  process.env.DB_USER,
			  process.env.DB_PASSWORD)
var handlers = {}
var beepboop = BeepBoop.start()
beepboop.on('open', () => {
  console.log('connection to Beep Boop server opened')
})
beepboop.on('error', (error) => {
  console.log('Error from Beep Boop connection: ', err)
})
beepboop.on('close', (code, message) => {
  console.log('Connection to Beep Boop was closed')
})
beepboop.on('add_resource', (message) => {
  console.log('Team added: ', message)
  var pdClient = new PDClient(message.resource.PIPEDRIVE_API_TOKEN, message.resource.PIPEDRIVE_SUBDOMAIN)
  handlers[message.resource.SlackTeamID] = new EventHandler(db, pdClient)
})

var slapp = Slapp({
  verify_token: process.env.SLACK_VERIFY_TOKEN,
  convo_store: ConvoStore(),
  context: Context()
})

slapp.use((msg, next) => {
    msg.meta.global_channel_id = [
        msg.meta.team_id, 
        msg.meta.channel_id || 'nochannel'
    ].join('::')
    next()
})

//*********************************************
// Setup different handlers for messages
//*********************************************

// "Conversation" flow that tracks state - kicks off when user says hi, hello or hey
slapp
  .message('^(hi|hello|hey)$', ['direct_mention', 'direct_message'], (msg, text) => {
    msg
      .say(`${text}, how are you?`)
      // sends next event from user to this route, passing along state
      .route('how-are-you', { greeting: text })
  })
  .route('how-are-you', (msg, state) => {
    var text = (msg.body.event && msg.body.event.text) || ''

    // user may not have typed text as their next action, ask again and re-route
    if (!text) {
      return msg
        .say("Whoops, I'm still waiting to hear how you're doing.")
        .say('How are you?')
        .route('how-are-you', state)
    }

    // add their response to state
    state.status = text

    msg
      .say(`Ok then. What's your favorite color?`)
      .route('color', state)
  })
  .route('color', (msg, state) => {
    var text = (msg.body.event && msg.body.event.text) || ''

    // user may not have typed text as their next action, ask again and re-route
    if (!text) {
      return msg
        .say("I'm eagerly awaiting to hear your favorite color.")
        .route('color', state)
    }

    // add their response to state
    state.color = text

    msg
      .say('Thanks for sharing.')
      .say(`Here's what you've told me so far: \`\`\`${JSON.stringify(state)}\`\`\``)
    // At this point, since we don't route anywhere, the "conversation" is over
  })

// handle channel join
slapp.event('message', (msg) => {
    if (msg.isBot() && msg.isMessage() && msg.body.event.subtype === 'channel_join') {
    	handlers[msg.meta.team_id].handleChannelJoin(msg)
    }
})

slapp.command('/pipedrive', '.*', (msg, text) => {
    handlers[msg.meta.team_id].handleDealSearch(msg, text)
})

slapp.action('link', 'choice', (msg, value) => {
    console.log(msg)
    console.log(JSON.stringify(msg))
    handlers[msg.meta.team_id].handleLink(msg, value)
})

slapp.action('relink', 'answer', (msg, value) => {
  msg.respond(msg.body.response_url, `${value} is a good choice!`)
})

// attach Slapp to express server
var server = slapp.attachToExpress(express())

// start http server
server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }

  console.log(`Listening on port ${port}`)
})
