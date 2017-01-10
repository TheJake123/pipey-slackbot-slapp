const Pipedrive = require('pipedrive')
const HOST = 'pipedrive.com/'
const DEFAULT_LIMIT = 10
const USERS = {
	Coen: 594918,
	Lucien: 594873,
	Thisj: 1517385,
	Pascal: 1092688,
	Wouter: 594916
}
class PDClient {
	constructor (apiKey, subdomain) {
		this.subdomain = subdomain
		this.pd = new Pipedrive.Client(apiKey)
		this.baseUrl = `https://${subdomain}.${HOST}`
	}
	searchDeals (name, start, limit, callback) {
		if (typeof limit === 'function') {
			callback = limit
			limit = DEFAULT_LIMIT
		} else if (typeof start === 'function') {
			callback = start
			limit = DEFAULT_LIMIT
			start = 0
		}
		console.log(`Searching for pipedrive deal matching "${name}"`)
		this.pd.SearchResults.getAll({
		    term: name,
		    item_type: "deal",
		    start: start,
		    limit: limit
		}, (err, deals, additionalData) => {
			if (err) console.error(err)
			callback(deals, additionalData)
		})
	}
	getDeal(id, resolveStage, callback) {
		if (typeof resolveStage === 'function') {
			callback = resolveStage
			resolveStage = false
		}
		this.pd.Deals.get(id, (err, deal) => {
			if (resolveStage) {
				this.pd.Stages.get(deal.stage_id, (err, stage) => {
					deal.stage_name = stage.name
					callback(deal)
				})
        	} else {
        		callback(deal)
        	}
		})
	}
	
	addNote(dealId, note, authorSlackId) {
		if (!(authorSlackId in USERS))
			throw new Error('unauthorized')
	}
}

module.exports = PDClient