const Event = require('../modules/base/event');

class Ready extends Event {
	constructor(client) {
		super(client);
		this.name = 'ready';
		this.description = 'Ready event - initialised on initiating connection to API';
	}

	run(client) {
		client.log('Marvin the Paranoid Android is charged up and online!');
		client.user.setActivity('life the universe and everything in it.', { 'type': 'LISTENING' });
		client.log(client.qotd());
	}
}

module.exports = Ready;