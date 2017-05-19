'use strict';

const logger = require('../log').gateway;
// const consumers = require('../consumers');

module.exports = function(req, res, next) {
  logger.debug(`key authentication`);
	let apikey;
	// let scopes;

	// check apikey in uuid format
	if (req.query.apikey != null) {
		apikey = req.query.apikey;
	} else if (req.body.apikey != null) {
		apikey = req.body.apikey;
	} else {
		apikey = req.headers['apikey'];
	}

	// scopes = req.context.scopes;

	// placeholder: pending on credential to implement the authenticateKey logic
	// if（!consumers.credentialService.authenticateKey(apikey, scopes)）{
	if (apikey == null) {
		// Unauthorized
		logger.debug(`key authentication failed`);
		res.status(401);
		res.send('Unauthorized');
	} else {
		next();
	}
};
