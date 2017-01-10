/**
 * http://usejsdoc.org/
 */
const messenger = require('./messenger')
const slack = require('slack')

class EventHandler {
	constructor (db, pd) {
		this.db = db
		this.pd = pd
	}
	
	handleChannelJoin(msg) {
		msg.say(messenger.channelGreeting())
    	this.db.getDealForChannel(msg.meta.global_channel_id, (dealId) => {
    		if (dealId !== -1) {
    			this.pd.getDeal(dealId, true, (deal) => {
    				msg.say(messenger.relinkConfirmation(deal))
    			})
        	} else {
        		handleChannelNameSearch(msg)
        	}
    	})
	}
	
	handleDealSearch(msg, searchTerm) {
		this.pd.searchDeals(searchTerm, 0, 3, (deals) => {
			if (deals.length === 0) {
				msg.say(messenger.noDealFound(searchTerm))
			} else {
				msg.say(messenger.linkChoices(deals, searchTerm, this.pd.baseUrl))
			}
		})
	}
	
	handleLink(msg, dealId) {
		this.db.setDealForChannel(msg.meta.global_channel_id, dealId)
		var originalMsg = msg.body.original_message
		var chosenAttachment = originalMsg.attachments[msg.body.attachment_id - 1]
		var replacementMessage = messenger.channelLinked(originalMsg, chosenAttachment, msg.meta.bot_user_id)
		msg.respond(msg.body.response_url, replacementMessage)
	}
	
	handleChannelNameSearch(msg) {
		slack.channels.info({
		      token: msg.meta.bot_token || msg.meta.app_token,
		      channel: msg.meta.channel_id
		    }, (err, data) => {
		    	this.handleDealSearch(msg, data.channel.name)
		    })
	}
	
	handleMention(msg) {
		msg.say(`I heard you <@${msg.meta.user_id}>`)
		this.db.getDealForChannel(msg.meta.global_channel_id, (dealId) => {
			if (dealId == -1) {
				msg.say("I'm sorry, this channel is not linked to a deal in Pipedrive yet. You first need to configure this with `/pipedrive [deal name]`")
			} else {
				console.log(JSON.stringify(msg))
				this.pd.addNote(dealId, "testnote", msg.meta.user_id, (err) => {
					if (err)
						msg.say(`Something went wrong: ${err}`)
				})
			}
		})
	}
}

module.exports = EventHandler