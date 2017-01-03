'use strict'

const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const Database = require('./database')
const Pipedrive = require('pipedrive')
const BeepBoop = require('beepboop')

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000
var db = new Database(
			  process.env.DB_HOST,
			  process.env.DB_PORT || 3306,
			  process.env.DB_USER,
			  process.env.DB_PASSWORD)
var pdClients = {}

var PDClient = function(apiKey) {
	this.apiKey = apiKey
	this.pd = new Pipedrive.Client(apiKey)
	this.searchDeals = function(name, callback) {
		this.pd.SearchResults.field({
		    term: name,
		    exact_match: false,
		    field_key: "title",
		    field_type: "dealField",
		    return_item_ids: true,
		    limit: 10
		}), (dealsListErr, dealsList) => {
			if (dealsListErr) console.log(dealsListErr);
			callback(dealsList)
		}
	}
}
var beepboop = BeepBoop.start({
	debug: true
	})
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
  pdClients[message.resource.SlackTeamID] = new PDClient(message.resource.PIPEDRIVE_API_KEY)
  console.log('Pipedrive client created with API key: ', message.resource.PIPEDRIVE_API_KEY)
})
var slapp = Slapp({
  // Beep Boop sets the SLACK_VERIFY_TOKEN env var
  verify_token: process.env.SLACK_VERIFY_TOKEN,
  convo_store: ConvoStore(),
  context: Context()
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

// Can use a regex as well
slapp.message(/^(thanks|thank you)/i, ['mention', 'direct_message'], (msg) => {
  // You can provide a list of responses, and a random one will be chosen
  // You can also include slack emoji in your responses
  msg.say([
    "You're welcome :smile:",
    'You bet',
    ':+1: Of course',
    'Anytime :sun_with_face: :full_moon_with_face:'
  ])
})

// demonstrate returning an attachment...
slapp.message('attachment', ['direct_mention', 'direct_message'], (msg, text) => {
	var deal = db.getDealForChannel(text)
	msg.say(`Found deal: $(deal)`)
/*  msg.say({
    text: 'Check out this amazing attachment! :confetti_ball: ',
    attachments: [{
      text: 'Slapp is a robust open source library that sits on top of the Slack APIs',
      title: 'Slapp Library - Open Source',
      image_url: 'https://storage.googleapis.com/beepboophq/_assets/bot-1.22f6fb.png',
      title_link: 'https://beepboophq.com/',
      color: '#7CD197'
    }]
  })*/
})

// handle channel join
slapp.event('message', (msg) => {
    if (msg.isBot() && msg.isMessage() && msg.body.event.subtype === 'channel_join') {
    	msg.say("Hey! Thanks for inviting me to this channel. I'll quickly check which Pipedrive deal this channel might be about...")
    	var deal = db.getDealForChannel(`$(msg.meta.team_id)::$(this.meta.channel_id)`)
    	if (deal !== -1) {
    		msg.say({
	    	    text: `It looks like you already linked this channel $(msg.meta.team_id)::$(this.meta.channel_id) to this pipedrive deal $(deal)`,
	    	    attachments: [{
	    	    	"text": "Would you like to keep this deal linked or select a new deal?",
		            "fallback": "You are unable to ",
		            "callback_id": "relink",
		            "color": "#3AA3E3",
		            "attachment_type": "default",
		            "actions": [
		                {
		                    "name": "keep",
		                    "text": "Keep link to current deal",
		                    "type": "button",
		                    "value": "keep",
		                    "type": "primary",
		                },
		                {
		                    "name": "change",
		                    "text": "Change deal",
		                    "type": "button",
		                    "value": "change"
		                }
		            ]
    	    	}]
    		})
    	} else {
    		deals = pdClients[msg.meta.team_id].searchDeals(msg.body.channel_name, (deals) => {
    			deals.forEach((deal) => {
        			msg.say(`Found $(deal.title)`)
    			})
    			msg.say(`Done with searching for this channel $(msg.meta.team_id)::$(this.meta.channel_id)`)
    		})
    	}
    }
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
