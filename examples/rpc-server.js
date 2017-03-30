const eqws = require('../');
const router = require('../../eqws-router').create();

const wss = new eqws.Server({
	port: 3000,
	host: 'localhost'
});

wss.plugin(router);

router.define('system.ping', (ctx) => {
	ctx.body = 'pong';
});

router.define('system.async', async (ctx) => {
	ctx.body = await db.getUsers();
});