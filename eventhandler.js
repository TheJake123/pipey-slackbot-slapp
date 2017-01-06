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
    	this.db.getDealForChannel(msg.meta.global_channel_id, (deal) => {
    		if (deal !== -1) {
        		msg.say(messenger.relinkConfirmation(deal))
        	} else {
        		slack.channels.info({
        		      token: msg.meta.bot_token || msg.meta.app_token,
        		      channel: msg.meta.channel_id
        		    }, (err, data) => {
                		this.handleDealSearch(msg, data.channel.name)
        		    })
        	}
    	})
	}
	
	handleDealSearch(msg, searchTerm) {
		this.pd.searchDeals(searchTerm, (deals) => {
			if (deals.length === 0) {
				msg.say(messenger.noDealFound(searchTerm))
			} else {
				msg.say(messenger.linkChoices(deals, searchTerm, this.pd.baseUrl))
			}
		})
	}
	
	handleLink(msg, dealId) {
		this.db.setDealForChannel(msg.meta.global_channel_id, dealId)
		msg.respond(msg.body.response_url, `Set deal to ${dealId}`)
	}
}

module.exports = EventHandler