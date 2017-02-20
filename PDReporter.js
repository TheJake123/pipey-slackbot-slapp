/**
 * http://usejsdoc.org/
 */
const EXPECTED_DATA = ['id', 'expected_close_date', 'stage_order_nr', 'status', 'value', 'market', 'org_name']


function sleep (time) {
	  return new Promise((resolve) => setTimeout(resolve, time));
}
Array.prototype.last = function(){
    return this[this.length - 1]
}

class PDReporter {
	constructor(pdClient) {
		this.pd = pdClient
		var today = new Date()
		this.currentMonth = this.monthId(today)
	}
	
	createIncomeReport() {
		return new Promise(resolve => {
			this.loadDeals()
				.then(deals => {
					var dirtyDeals = deals.filter(deal => deal.dirty)
					if (dirtyDeals.length > 0) {
						console.debug(`${dirtyDeals.length} incomplete deals found, complete the below deals in Pipedrive:`)
						dirtyDeals.forEach(deal => {
							EXPECTED_DATA.forEach(key => {
								console.debug(`Missing data: ${key} not found for deal ${deal.id}`)								
							})
							if (!deal.market)
								console.debug(`Product/market combination unknown for deal ${deal.id}`)
						})
					}					
					var openPastDeals = deals.filter(deal => deal.past && deal.status == 'open')
					if (openPastDeals.length > 0) {
						console.log(`${openPastDeals.length} open deals wit hexpected close date in the past found:`)
						openPastDeals.forEach(deal => {
							console.log(`Deal ${deal.id} ${deal.title} with expected deal date ${deal.expected_close_date}`)
						})
					}
				})
				.then(resolve("success"))
		})
	}
	
	analyzeProgress() {
		this.loadDeals()
			.then(deals => {
				return this.fillDetails(deals)
			})
			.then(deals => {
				console.log(JSON.stringify(deals[500]))
				deals.forEach(deal => {
					var message = ""
					var stages = [1,2,3,4,5]
					stages.forEach(stage => {
						message += ";" + (deal.stay_in_pipeline_stages.times_in_stages[stage] || "")
					})
					//console.log(JSON.stringify(deal))
					//console.log(`${deal.id};${deal.add_time};${deal.won_time};${deal.lost_time}${message};${deal.status};${deal.stage_id}`)
				})
				console.log("done")
			})
			.catch(err => {
				console.log(`Error: ${err}`)
			})
	}
	
	loadDeals(start, limit) {
		if (!limit) limit = 100
		if (!start) start = 0
		return new Promise((resolve, reject) => {
			this.pd.Deals.getAll({
				start: start,
				limit: limit
			}).then(result => {
				var pagination = result.additionalData.pagination
				if (pagination.more_items_in_collection) {
					this.loadDeals(pagination.next_start, limit)
					.then(nextDeals => {
						var deals = result.deals.concat(nextDeals)
						resolve(deals)
					})
					.catch(() => resolve(result.deals))
				} else {
					resolve(result.deals)
				}
			})
		})
	}
	
	fillDetails(deals) {
		return Promise.all(deals.map((deal) => {
			return this.pd.Deals.get(deal.id)
		}))
	}

	cleanDeals(deals) {
		return Promise.all(deals.map((deal) => {
			return this.cleanDeal(deal)
		}))
	}

	cleanDeal(deal) {
		return new Promise(resolve => {
			deal.duration = deal['84133a71baf7a8a58c7cbe53ebfd217ad9a88fe8'] || 12
			this.loadProducts(deal).then(deal => {
				console.log(`Deal[${deal.id}]: ${deal.title} in stage[${deal.stage_order_nr}]`)
				if (!deal.expected_close_date || !deal.market) {
					deal.dirty = true
					resolve(deal)
				} else {
					var dealDate = deal.expected_close_date
					var dealMonth = this.monthId(dealDate)
					if (dealMonth < this.currentMonth)
						console.log("past")
						deal.past = true
					resolve(deal)
				}
			})
		})
	}
	
	loadProducts(deal) {
		return new Promise(resolve => {
			if (deal.products_count) {
				deal.getProducts({include_product_data: 1}, (err, products) => {
					if (err) return resolve(err)
					products.forEach(product => {
						deal.market = product.product.code
						deal.products = [{
							name: product.name,
							price: product.item_price,
							"discount-percentage": product["discount-percentage"],
							"product-variant": "Not defined"
						}]
						deal.aantal_factuuren = product.duration || 1
					})
					resolve(deal)
				})
			} else {
				deal.products = [{
					price: 0,
					"discount-percentage": 0,
					"product-variant": "Not defined"
				}]
				deal.aantal_facturen = 1
				resolve(deal)
			}
		})
	}
	
	monthId(date) {
		if (typeof date == 'string')
			return date.substring(0,4) * 12 + date.substring(5,2)
		else {
			return date.getFullYear() * 12 + date.getMonth() + 1
		}
	}
}

module.exports = PDReporter