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
    				msg.say(messenger.relinkConfirmation(deal, this.pd.baseUrl))
    			})
        	} else {
        		this.handleChannelNameSearch(msg)
        	}
    	})
	}
	
	handleDealSearch(msg, searchTerm) {
		if (!msg.isBot() && !this.pd.isAuthorized(msg.meta.user_id)) {
			return msg.respond(msg.body.response_url, messenger.unauthorized())
		}
		this.pd.searchDeals(searchTerm, 0, 3, (deals) => {
			if (deals.length === 0) {
				msg.say(messenger.noDealFound(searchTerm))
			} else {
				msg.say(messenger.linkChoices(deals, searchTerm, this.pd.baseUrl))
			}
		})
	}
	
	handleLink(msg, dealId) {
		if (!this.pd.isAuthorized(msg.meta.user_id)) {
			return msg.respond(msg.body.response_url, messenger.unauthorized())
		}
		this.db.setDealForChannel(msg.meta.global_channel_id, dealId)
		var originalMsg = msg.body.original_message
		var chosenAttachment = originalMsg.attachments[msg.body.attachment_id - 1]
		var replacementMessage = messenger.channelLinked(originalMsg, chosenAttachment, msg.meta.bot_user_id)
		msg.respond(msg.body.response_url, replacementMessage)
	}
	
	handleSearchCommand(msg, text) {
		if (!this.pd.isAuthorized(msg.meta.user_id)) {
			return msg.respond(msg.body.response_url, messenger.unauthorized())
		}
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
		if (!this.pd.isAuthorized(msg.meta.user_id)) {
			return msg.respond(msg.body.response_url, messenger.unauthorized())
		}
		this.db.getDealForChannel(msg.meta.global_channel_id, (dealId) => {
			if (dealId == -1) {
				msg.say("I'm sorry, this channel is not linked to a deal in Pipedrive yet. You first need to configure this with `/pipedrive [deal name]`")
			} else {
				var note = msg.body.event.text.replace(`<@${msg.meta.bot_user_id}>`, "").trim()
				if (note != '') {
					this.pd.addNote(dealId, note, msg.meta.user_id, (err) => {
						if (err)
							msg.say(`Something went wrong: ${err}`)
						else
							slack.reactions.add({
								token: msg.meta.bot_token || msg.meta.app_token,
								name: "spiral_note_pad",
							    channel: msg.meta.channel_id,
							    timestamp: msg.body.event.event_ts
							}, (err) => {
								console.log(err)
							})
					})
				}
			}
		})
	}
	
	handleKeepDeal(msg) {
		var originalMsg = msg.body.original_message
		var replacementMessage = messenger.dealKept(originalMsg)
		msg.respond(msg.body.response_url, replacementMessage)
	}
	
	handleChangeLink(msg) {
		if (!this.pd.isAuthorized(msg.meta.user_id)) {
			return msg.respond(msg.body.response_url, messenger.unauthorized())
		}
		this.handleChannelNameSearch(msg)
	}
}

module.exports = EventHandler