const Pipedrive = require('pipedrive')
const HOST = 'pipedrive.com/'
const DEFAULT_LIMIT = 10

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
}

module.exports = PDClient