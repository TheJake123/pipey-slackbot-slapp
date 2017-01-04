const Pipedrive = require('pipedrive')

var PDClient = function(apiKey) {
	this.apiKey = apiKey
	this.pd = new Pipedrive.Client(apiKey)
	
	this.searchDeals = function(name, callback) {
		this.pd.SearchResults.getAll({
		    term: name,
		    item_type: "deal",
		    start: 0,
		    limit: 10
		}, (dealsListErr, dealsList) => {
			if (dealsListErr) console.log(dealsListErr);
			callback(dealsList)
		})
	}
}

module.exports = PDClient