const eqws = require('../');
const Redis = require('../../eqws-redis');

const wss = new eqws.Server({
	port: 3001,
	host: 'localhost'
});

wss.adapter(Redis, {});