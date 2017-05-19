'use strict';

const debug = require('debug')('gateway:keyauth');
// const consumers = require('../consumers');

module.exports = function(req, res, next) {
  debug('authenticating with API Key');
	let apikey;
	// let scopes;

	apikey = req.query.apikey;
	// scopes = req.context.scopes;

	// placeholder: pending on credential to implement the authenticateKey logic
	// if（!consumers.credentialService.authenticateKey(apikey, scopes)）{
	if (apikey == null) {
		// Unauthorized
		res.status(401);
		res.send('Unauthorized');
	} else {
		next();
	}
};
