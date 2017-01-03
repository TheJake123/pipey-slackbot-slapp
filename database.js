const Mysql = require('mysql')


class Database {
	constructor (host, port, user, password, database) {
		this.db = Mysql.createConnection({
			  host: host,
			  port: port,
			  user: user,
			  password: password,
			  database : database || 'pipey'
			})
		//connect to database
		this.db.connect((err) => {
		  if (err) {
		    return console.error('error connecting to database: ' + err.stack)
		  }

		  console.log('connected to database')
		});
	}

	getDealForChannel(channel) {
		console.log(`Querying db for channel ${channel}`)
		var params = {channel: channel}
		this.db.query('SELECT deal FROM channel_deal WHERE ? LIMIT 1', params, function(err, rows, fields) {
			  if (err) throw err
			  if (!rows.length) return -1
			  return rows[0].deal
			})
	}

	setDealForChannel(channel, deal) {
		console.log(`Updating db for channel ${channel} with deal ${deal}`)
		var params = [channel, deal, deal]
		this.db.query('INSERT INTO channel_deal (channel, deal) VALUES(?,?) ON DUPLICATE KEY UPDATE deal=?', params, function(err, rows, fields) {
			  if (err) throw err
			})
	}
}

module.exports = Database
