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
    				msg.say(relinkConfirmation(deal))
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
		var replacementMessage = messenger.channelLinked(originalMsg, chosenAttachment)
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
	}
}

module.exports = EventHandler