"use strict";

const fs = require("fs");
const decode = require("can-dbc-decode");

class DBC {
	/**
	 * 
	 * @param {CAN.Message[]} messages 
	 */
	constructor(messages) {
		this.messages = messages;
	}

	/**
	 * 
	 * @param {number} frame_id 
	 * @returns {CAN.Message}
	 */
	get_message_by_frame_id(frame_id) {
		for (let message of this.messages) {
			if ((message.frame_id & 0x1FFFFFFF) === (frame_id  & 0x1FFFFFFF))
				return message;
		}
		return null;
	}

	/**
	 * 
	 * @param {number} frame_id 
	 * @param {Uint8Array} data 
	 * @returns {{[name: string]: number}}
	 */
	decode_message(frame_id, data) {
		let map = {};
		let msg = this.get_message_by_frame_id(frame_id);
		if (!msg) {
			// message unrecognized based on current DBC file
			return map;
		}
		for (let signal of msg.signals) {
			let realstart = Math.floor(signal.start / 8) * 8 + (7 - (signal.start % 8));
			let input = {
				rawData: Buffer.from(data).toString('hex'),
				start: realstart,
				size: signal.size,
				factor: signal.scale,
				offset: signal.offset,
				precision: 5,
				endianness: signal.littleendian ? 0 : 1
			}	
			let result = decode(input);
			map[signal.name] = result;
		}
		return map;
	}

}

class MessageBuilder {
	constructor() {
		this.message = {};
		this.signals = [];
	}
	setLine(line) {
		let parts = line.split(" ");
		this.message.frame_id = parseInt(parts[1]);
		this.message.name = yeetEnd(parts[2]);
		this.message.size = parseInt(parts[3]);
		this.message.sender = parts[4];
	}
	addSignal(signal) {
		this.signals.push(signal);
	}
	/**
	 * @returns {CAN.Message}
	 */
	build() {
		this.message.signals = this.signals;
		return this.message;
	}
}

class SignalBuilder {
	constructor() {
		this.signal = {};
	}
	setLine(line) {
		let parts = line.split(" ");
		this.signal.name = parts[1];
		let ss = parts[3];
		this.signal.start = parseInt(ss.split("|")[0]);
		this.signal.size = parseInt(ss.split("|")[1].split("@")[0]);
		this.signal.littleendian = ss.split("@")[1].substr(0,1) === "1";
		this.signal.negative = ss.split("@")[1].substr(1,1) === "-";
		let so = yeetEdges(parts[4]).split(",");
		this.signal.scale = parseFloat(so[0]);
		this.signal.offset = parseFloat(so[1]);
		let mx = yeetEdges(parts[5]).split("|");
		this.signal.min = mx[0];
		this.signal.max = mx[1];
		this.signal.units = yeetEdges(parts[6]);
	}
	/**
	 * @returns {CAN.Signal}
	 */
	build() {
		return this.signal;
	}
}

function yeetEdges(s) {
	if (s.length < 2)
		throw new Exception("input string too small");
	return s.substr(1, s.length-2);
}

function yeetEnd(s) {
	if (s.length < 1)
		throw new Exception("input string too small");
	return s.substr(0, s.length - 1);
}

/**
 * 
 * @param {string} filename 
 * @returns {DBC}
 */
function load_file(filename)
{
	let data = fs.readFileSync(filename, "utf-8");
	let msgbuild = null;
	let messages = [];
	// read file line by line
	for (let line of data.split("\n")) {
		line = line.trim();
		if (line.startsWith("BO_ ")) { // saw next message
			if (msgbuild != null) {
				messages.push(msgbuild.build());
			}
			msgbuild = new MessageBuilder();
			msgbuild.setLine(line);
		} else if (line.startsWith("SG_") && msgbuild != null) { // reading a new signal for current message
			let sigbuild = new SignalBuilder();
			sigbuild.setLine(line);
			msgbuild.addSignal(sigbuild.build());
		}
	}
	// after EOF
	if (msgbuild != null) {
		messages.push(msgbuild.build());
		msgbuild = null;
	}
	return new DBC(messages);
}

exports.database = {
	load_file: load_file
};
