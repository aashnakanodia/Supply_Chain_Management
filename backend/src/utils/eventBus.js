const EventEmitter = require('events');

// Singleton event bus — services emit here, socket layer listens here.
// Node.js module cache guarantees every require() returns the same instance.
const bus = new EventEmitter();
bus.setMaxListeners(50);

module.exports = bus;
