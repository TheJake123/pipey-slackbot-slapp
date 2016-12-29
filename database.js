const Mysql = require('mysql')


class Database {
	constructor (host, port, user, password) {
		this.db = Mysql.createConnection({
			  host: host,
			  port: port,
			  user: user,
			  password: password
			})
		//connect to database
		db.connect((err) => {
		  if (err) {
		    return console.error('error connecting to database: ' + err.stack)
		  }

		  console.log('connected to database')
		});
	}

	getDealForChannel(channel) {
		var params = {channel: channel}
		this.db.query('SELECT deal FROM channel_deal WHERE ? LIMIT 1', params, function(err, rows, fields) {
			  if (err) throw err
			  return rows[0].deal
			})
	}

	setDealForChannel(channel, deal) {
		var params = [channel, deal, deal]
		this.db.query('INSERT INTO channel_deal (channel, deal) VALUES(?,?) ON DUPLICATE KEY UPDATE deal=?', params, function(err, rows, fields) {
			  if (err) throw err
			})
	}
}

module.exports = Database
