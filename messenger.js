/**
 * http://usejsdoc.org/
 */
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

class Messenger {
	linkChoices(deals, searchTerm, baseUrl) {
		const styles = {
				won: {
					emoji: ":moneybag:",
					color: "#43C35E"
				},
				lost: {
					emoji: ":money_with_wings:",
					color: "#F0ACAC"
				},
				open: {
					emoji: "",
					color: ""
				}
		}
		var attachments = []
		deals.forEach((deal) => {
			var status = deal.details.status
			var stage = deal.details.stage_name
			var attachment = {
		         "title": deal.title,
				 "title_link": `${baseUrl}deal/${deal.id}`,
		         "fallback": deal.title,
		         "callback_id": "link",
		         "color": styles[status].color,
				 "fields": [
		                {
		                    "title": "Status",
		                    "value": `${styles[status].emoji}${status.capitalize()}`,
		                    "short": true
		                },
						{
							"title": "Stage",
							"value": stage,
							"short": true
						}
				 ],
		         "actions":[
		            {
		               "name":"choice",
		               "text": "Link to Channel",
		               "type": "button",
					   "style": "primary",
		               "value": deal.id
		            }
		         ]
		      }
			if (status === "won" || status === "lost") {
				attachment.actions[0].confirm = {
						title: "Are you sure?",
						text: `The deal you selected is already ${status}, are you sure you want to link it to this channel?`,
						ok_text: "Yes"
				}
			}
			attachments.push(attachment)
		})
		return {
    	    text: `I found ${deals.length} deals matching _${searchTerm}_, which one would you like to link to this channel?`,
    	    attachments: attachments
		}
	}
	relinkConfirmation() {
		return {
    	    text: `It looks like you already linked this channel to a deal in pipedrive`,
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
	
	noDealFound(searchTerm) {
		return `I couldn't find any deals that match _${searchTerm}_. If you want me to search for a deal with another name, just type \`/pipedrive [deal name]\``
	}
	
	channelGreeting() {
		return "Hey! Thanks for inviting me to this channel. I'll quickly check which Pipedrive deal this channel might be about..."
	}
	
	channelLinked(originalMsg, chosenAttachment) {
		originalMsg.attachments = [{
			"title": chosenAttachment.title,
			"title_link": chosenAttachment.title_link,
	        "fallback": chosenAttachment.title,
	        "color": chosenAttachment.color,
	        "fields": chosenAttachment.fields,
	        "actions":[
	            {
	               "name":"alreadylinked",
	               "text": ":heavy_check_mark:Deal Linked",
	               "type": "button",
				   "style": "primary"
	            }
	         ],
	        "text": ":link: Deal linked to this channel. You can now mention @pipey in any message to create a note in this deal."
		}]
		return originalMsg
	}
}

module.exports = new Messenger()