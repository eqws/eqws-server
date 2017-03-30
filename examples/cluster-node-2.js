const eqws = require('../');
const Redis = require('../../eqws-redis');

const wss = new eqws.Server({
	port: 3001,
	host: 'localhost'
});

wss.adapter(Redis, {});

wss._adapter.clients().then(list => {
	const sid = list[0];

	wss._adapter.remoteLeave(sid, 'test_room').then((result) => {
		console.log('result', result);
	});
}).catch(err => {
	console.log('reject', err);
});