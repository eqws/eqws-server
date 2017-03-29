const eqws = require('../');
const Redis = require('../../eqws-redis');

const wss = new eqws.Server({
	port: 3000,
	host: 'localhost'
});

wss.adapter(Redis, {});

wss.on('connected', socket => {
	socket.on('test', data => {
		console.log(data);
	});

	socket.join('test_room');
	socket.emit('test', {work23: 2}, 'test', false);
});

setInterval(() => {
	wss.to('default').emit('test', {hello: 'world'});
}, 1000);