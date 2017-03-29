const uid2         = require('uid2');
const EventEmitter = require('events').EventEmitter;
const debug        = require('debug')('eqws-server:socket');
const error        = require('debug')('eqws-server:socket:error');

const Protocol = require('../../eqws-protocol');
const Packet   = Protocol.Packet;
const C        = Protocol.C;

const emit = EventEmitter.prototype.emit;

class SocketWrapper extends EventEmitter {
	constructor(socket, opts) {
		super();

		this.socket   = socket;
		this.isClosed = false;
		this.id       = uid2(6);

		this._options = opts;
		this._handshakeData = null;
		this._setUpHandshakeData();

		this.socket.once('close', this._onDisconnect.bind(this));
		this.socket.on('message', this._onMessage.bind(this));
	}

	send(data) {
		if (data instanceof Packet) {
			this._sendPacket(data);
		} else if (data instanceof ArrayBuffer) {
			this._sendNative(data);
		} else {
			const packet = new Packet(C.PACKET_TYPES.MESSAGE, args);
			this._sendPacket(packet);
		}
	}

	emit(e) {
		if (~C.IMPORTANT_EVENTS.indexOf(e)) {
			return emit.apply(this, arguments);
		}

		const args = Array.prototype.slice.call(arguments);
		const packet = new Packet(C.PACKET_TYPES.EVENT, args);

		this._sendPacket(packet);
	}

	_sendPacket(packet) {
		const data = packet.encode();

		debug('send packet', data);
		this.socket.send(data);
	}

	_sendNative(data) {
		debug('send native', data);
		this.socket.send(data);
	}

	getHandshakeData() {
		return this._handshakeData;
	}

	close() {
		this.destroy();
	}

	destroy() {
		this.socket.close();
	}

	_ping() {
		this.socket.ping();
	}

	_onDisconnect() {
		this.isClosed = true;
		this.emit('disconnect');
		this.socket.removeAllListeners();
	}

	_onError(err) {
		debug('socket=%d error', this.id, err);
	}

	_onMessage(message) {
		debug('received message socket=%s size=%d', this.id,
			message.length || message.byteLength);

		try {
			const packet = Packet.parse(message);
			debug('parsed packet=%d socket=%s', packet.type, this.id);

			if (!packet.isValid()) {
				return debug('received scoket=%s invalid packet', this.id);
			}

			switch (packet.type) {
				case C.PACKET_TYPES.MESSAGE:
					this.emit('message', packet.data);
					break;

				case C.PACKET_TYPES.EVENT:
					emit.apply(this, packet.data);
					break;
			}

			this.emit('packet', packet);
		} catch (err) {
			this._onError(err);
		}
	}

	_setUpHandshakeData() {
		this._handshakeData = {
			remoteAddress: this.socket._socket.remoteAddress
		}

		if (this.socket.upgradeReq) {
			this._handshakeData.headers = this.socket.upgradeReq.headers;
			this._handshakeData.referer = this.socket.upgradeReq.headers.referer;
			this._handshakeData.url = this.socket.upgradeReq.url;
		}

		return this._handshakeData;
	}
}

module.exports = SocketWrapper;