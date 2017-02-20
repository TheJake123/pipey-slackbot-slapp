'use strict'

const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const Database = require('./database')
const PDClient = require('./PDClient')
const BeepBoop = require('beepboop')
const EventHandler = require('./eventhandler')
const bodyParser = require('body-parser')
const parameters = require('parameters-middleware');
const lang = require('langdetect');

var app = express()

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
slapp.message('.*', ['mention', 'direct_mention'], (msg, text) => {
    console.log(text)
    if (!msg.isBot())
        handlers[msg.meta.team_id].handleMention(msg)
  })

// handle channel join
slapp.event('message', (msg) => {
    if (msg.isBot() && msg.isMessage() && msg.body.event.subtype === 'channel_join') {
    	handlers[msg.meta.team_id].handleChannelJoin(msg)
    }
})

slapp.command('/pipedrive', '.*', (msg, text) => {
    handlers[msg.meta.team_id].handleSearchCommand(msg, text)
})

slapp.action('link', 'choice', (msg, value) => {
    handlers[msg.meta.team_id].handleLink(msg, value)
})

slapp.action('relink', 'answer', (msg, value) => {
    if (value == 'keep') {
        handlers[msg.meta.team_id].handleKeepDeal(msg)
    } else if (value == 'change') {
        handlers[msg.meta.team_id].handleChangeLink(msg)
    }
})

app.post('/leads/pressrelease', parameters({
    body : ["url", "description", "title", "source"]
  }),
  (req, res)  => {
    extractOrEnrichEmail(req.body.description, req.body.url)
    .catch(err => {
        console.log(err)
        res.status(410).send("Could not extract email")
    })
    .then(email => {
        console.log(email)
        var language = lang.detectOne(req.body.description)
        console.log(language)
        return db.addPRProspect({
            language,
            email,
            source: req.body.source,
            source_url: req.body.url,
            source_title: req.body.title,
            source_description: req.body.description
        })
    })
    .catch(err => {
        console.log(err)
        res.status(409).send("Could not add prospect (they most likely already exist)")
    })
    .then(rows => {
        res.send(`Prospect added to database`)
    })
    
})

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

function extractOrEnrichEmail(text, originalUrl) {
    return new Promise((resolve, reject) => {
        var email = extractEmail(text)
        if (!email) {
            var enrichtmentUrl = `http://ftr.fivefilters.org/makefulltextfeed.php?url=${originalUrl}&max=1`
            request(enrichtmentUrl, function (error, response, body) {
                if (error || response.statusCode != 200) return reject(error)
                email = extractEmail(body)
                if (!email) {
                    return reject("No email found")
                } else {
                    return resolve(email)
                }
            })
        } else {
            return resolve(email)
        }
    })
}

function extractEmail(text) {
    var match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i) 
    return match ? match[0] : null
}


// attach Slapp to express server
var server = slapp.attachToExpress(app)

// start http server
server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }

  console.log(`Listening on port ${port}`)
})
