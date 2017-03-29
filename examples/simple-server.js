const eqws = require('../');

const wss = new eqws.Server({
	port: 3000,
	host: 'localhost'
});

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

setTimeout(() => {
	wss._sockets[0].close()
}, 5000);
