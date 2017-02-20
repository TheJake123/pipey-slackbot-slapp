const Pipedrive = require('pipedrive')
const RATE_LIMIT = 90/10000 //90 calls per 10000 ms (10 seconds)
const throttle = require('promise-ratelimit')(1 / RATE_LIMIT) //rateInMilliseconds

const HOST = 'pipedrive.com/'
const DEFAULT_LIMIT = 10
const USERS = {
	U02DP2WS2: 594918,
	U02DM8GA5: 594873,
	U1MNT226M: 1517385,
	U0K766DT2: 1092688,
	U02FYE0V2: 594916,
	U289X75FZ: 594918
}
class PDClient {
	
	constructor (apiKey, subdomain) {
		this.subdomain = subdomain
		this.pd = new Pipedrive.Client(apiKey)
		this.baseUrl = `https://${subdomain}.${HOST}`
		this.Deals = {
			getAll: (params) => {
				return new Promise((resolve, reject) => {
					throttle().then(() => {
						this.pd.Deals.getAll(params, (err, deals, additionalData) => {
							if (err) return reject(err)
							resolve({deals, additionalData})
						})
					})
				})
			},
			get: (id) => {
				return new Promise((resolve, reject) => {
					throttle().then(() => {
						this.pd.Deals.get(id, (err, deal) => {
							if (err) return reject(err)
							resolve(deal)
						})
					})
				})
			},
			update: (id, params) => {
				return new Promise((resolve, reject) => {
					throttle().then(() => {
						console.log(`Updating ${id}`)
						this.pd.Deals.update(id, params, (err) => {
							if (err) return reject(err)
							resolve()
						})
					})
				})
			}
		}
		this.Persons = {
			getAll: (params) => {
				return new Promise((resolve, reject) => {
					throttle().then(() => {
						this.pd.Persons.getAll(params, (err, persons, additionalData) => {
							if (err) return reject(err)
							resolve({persons, additionalData})
						})
					})
				})
			}
		}
	}
	
	isAuthorized(slackUserId) {
		return slackUserId in USERS
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
	
	addNote(dealId, note, authorSlackId, callback) {
		if (!(this.isAuthorized(authorSlackId)))
			callback(new Error('unauthorized'))
		this.pd.Notes.add({
			content: note,
			deal_id: dealId,
			user_id: USERS[authorSlackId]
		}, callback)
	}
	
	generateReport() {
		return this.reporter.createReport()
	}
}

module.exports = PDClient