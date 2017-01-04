/**
 * http://usejsdoc.org/
 */
class Messenger {
	listDealOptions(deals) {
		const emojis = {
				won: ":moneybag:",
				lost: ":money_with_wings:",
				open: ""
		}
		var actions = []
		deals.forEach((deal) => {
			var status = deal.details.status
			var action = {
					name: "choice",
					text: `${emojis[status]} ${deal.title}`,
					type: "button",
					value: deal.id
			}
			if (status === "won" || status === "lost") {
				action.confirm = {
						title: "Are you sure?",
						text: `The deal you selected is already ${status}, are you sure you want to link it to this channel?`,
						ok_text: "Yes"
				}
			}
			actions.push (action)
		})
		return {
    	    text: `I found ${deals.length} deals that might fit this channel`,
    	    attachments: [{
    	    	"title": "Which deal would you like to link to this channel?",
    	    	"text": `${emojis.won} = won deals, ${emojis.lost} = lost deals`,
	            "fallback": "You are unable to link a deal to this channel",
	            "callback_id": "link",
	            "color": "#3AA3E3",
	            "attachment_type": "default",
	            "actions": actions
	    	}]
		}
	}
	confirmRelink(deal_id) {
		return {
    	    text: `It looks like you already linked this channel to <https://nineconnections.pipedrive.com/deal/${deal_id}|this> deal in pipedrive`,
    	    attachments: [{
    	    	"text": "Would you like to keep this deal linked or select a new deal?",
	            "fallback": "You are unable to change the channel-deal link",
	            "callback_id": "relink",
	            "color": "#3AA3E3",
	            "attachment_type": "default",
	            "actions": [
	                {
	                    "name": "answer",
	                    "text": "Keep current deal linked",
	                    "type": "button",
	                    "value": "keep",
	                    "style": "primary",
	                },
	                {
	                    "name": "answer",
	                    "text": "Change deal",
	                    "type": "button",
	                    "value": "change"
	                }
	            ]
	    	}]
		}
	}
}

module.exports = new Messenger()