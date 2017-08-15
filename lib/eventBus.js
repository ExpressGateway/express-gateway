const {EventEmitter} = require('events');
const logger = require('./logger').gateway;
class EventBus extends EventEmitter {}
logger.debug('Initiating Event Bus');
module.exports = new EventBus();
