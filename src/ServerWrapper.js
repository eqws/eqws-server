const debug         = require('debug')('eqws-server');
const error         = require('debug')('eqws-server:error');
const EventEmitter  = require('events');
const uws           = require('uws');
const SocketWrapper = require('./SocketWrapper');
const Adapter       = require('../../eqws-adapter');
const Protocol      = require('../../eqws-protocol');

const Packet = Protocol.Packet;
const C      = Protocol.C

class ServerWrapper extends EventEmitter {
	/**
	 * Server contructor
	 * @param {Object} opts
	 */
	constructor(opts = {}) {
		super();

		this._sockets   = [];
		this._connected = {};
		this._options = opts;
		this._plugins = [];
		this._adapter = null;

		this.set('authentication', (socket) => {
			return new Promise((resolve, reject) => {
				debug(`simple auth (${socket.id})`);
				resolve({empty: true});
			});
		});

		this._ws = new uws.Server(opts);
		this._ws.on('error', this._onError.bind(this));
		this._ws.on('connection', this._onSocketConnection.bind(this));

		this.adapter(Adapter);
	}

	/**
	 * Update adapter
	 * @param  {EQWSAdapterClass} adapter
	 */
	adapter(adapter, opts = this._options) {
		this._adapter = new adapter(this, opts);
		this._adapter.on('error', this._onError.bind(this));
	}

	/**
	 * Method to update inside logic methods
	 * @param {String}   key
	 * @param {Function} fn
	 */
	set(key, fn) {
		this[`_${key}`] = fn;
	}

	_onError(err) {
		error(err);
	}

	_register(socketWrapper, authData) {
		if (authData === false || authData instanceof Error) {
			this._rejectConnection(socketWrapper, authData);
		} else {
			this._onSocketConnected(socketWrapper, authData);
		}
	}

	_rejectConnection(socketWrapper, reason) {
		debug('auth reject with', reason);
		socketWrapper.destroy();
	}

	_onSocketConnection(socket) {
		const socketWrapper = new SocketWrapper(socket, this._options);
		const handshakeData = socketWrapper.getHandshakeData();

		this.emit('connecting', socketWrapper, handshakeData);

		debug(`connection from ${handshakeData.origin} (${handshakeData.remoteAddress})`);

		this._authentication(socketWrapper, handshakeData)
			.then(this._register.bind(this, socketWrapper))
			.catch(this._onError.bind(this));
	}

	_onSocketConnected(socketWrapper, authData) {
		debug(`socket connected (${socketWrapper.id})`);

		socketWrapper.on('packet', this._onSocketPacket.bind(this, socketWrapper));
		socketWrapper.once('disconnect', this._onSocketClose.bind(this, socketWrapper));

		this._sockets.push(socketWrapper);
		this._connected[socketWrapper.id] = socketWrapper;

		// Extend interface
		const adapter = this._adapter;
		socketWrapper.join  = adapter.join.bind(adapter, socketWrapper.id);
		socketWrapper.leave = adapter.leave.bind(adapter, socketWrapper.id);

		this._adapter.join(socketWrapper.id, 'default')
			.then(this.emit.bind(this, 'connected', socketWrapper))
			.catch(this._onError.bind(this));
	}

	_onSocketPacket(socketWrapper, packet) {
		this.emit(`packet`, socketWrapper, packet);
		this.emit(`packet:${packet.type}`, socketWrapper, packet);
	}

	_onSocketClose(socketWrapper) {
		debug(`socket disconnect (${socketWrapper.id})`);

		const index = this._sockets.indexOf(socketWrapper);
		this._sockets.splice(index, 1);
		delete this._connected[socketWrapper.id];

		this._adapter.leaveAll(socketWrapper.id);
		this.emit('disconnect', socketWrapper);
	}

	to(room) {
		return {
			emit: this._broadcast.bind(this, room, C.PACKET_TYPES.EVENT)
		};
	}

	_broadcast(room, packetType) {
		const args = Array.prototype.slice.call(arguments, 2);
		const packet = new Packet(packetType, args);

		this._adapter.broadcast(packet, room);
	}
}

module.exports = ServerWrapper;