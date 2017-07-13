/**
 * Module dependencies.
 */
let passport = require('passport');
let util = require('util');

/**
 * `Strategy` constructor.
 *
 * The local api key authentication strategy authenticates requests based on the
 * credentials submitted through an HTML-based login form.
 *
 * Applications must supply a `verify` callback which accepts `username` and
 * `password` credentials, and then calls the `done` callback supplying a
 * `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occured, `err` should be set.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `apiKeyField`  field name where the apikey is found, defaults to _apiKey_
 *   - `apiKeyHeader`  header name where the apikey is found, defaults to _apiKey_
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Examples:
 *
 *     passport.use(new LocalAPIKeyStrategy(
 *       function(apikey, done) {
 *         User.findOne({ apikey: apikey }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy (options, verify) {
  if (typeof options === 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('local authentication strategy requires a verify function');

  this._apiKeyField = options.apiKeyField || 'apiKey';
  this._apiKeyHeader = options.apiKeyHeader || 'Authorization';
  this._apiKeyHeaderScheme = options.apiKeyHeaderScheme || 'apiKey';

  passport.Strategy.call(this);
  this.name = 'localapikey';
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function (req, options) {
  options = options || {};
  let apikey;

  if (!options.disableHeaders) {
    apikey = lookup(req.headers, (options.apiKeyHeader || this._apiKeyHeader || '').toLowerCase());
    if (apikey) {
      let parts = apikey.split(' ');
      apikey = parts[parts.length - 1];
      // enforcing scheme in the header
      if (!options.disableHeadersScheme) {
        if (parts[0].toLowerCase() !== (options.apiKeyHeaderScheme || this._apiKeyHeaderScheme).toLowerCase()) {
          apikey = undefined; // api key is not valid, header scheme didn't match
        }
      }
    }
  }
  if (!apikey && !options.disableQueryParam) {
    apikey = lookup(req.query, options.apiKeyField || this._apiKeyField);
  }
  if (!apikey && !options.disableBody) {
    apikey = lookup(req.body, options.apiKeyField || this._apiKeyField);
  }

  if (!apikey) {
    return this.fail(new Error(options.badRequestMessage || 'Missing API Key'));
  }

  let self = this;

  function verified (err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info); }
    self.success(user, info);
  }

  if (self._passReqToCallback) {
    this._verify(req, apikey, verified);
  } else {
    this._verify(apikey, verified);
  }

  function lookup (obj, field) {
    if (!obj) { return null; }
    let chain = field.split(']').join('').split('[');
    for (let i = 0, len = chain.length; i < len; i++) {
      let prop = obj[chain[i]];
      if (typeof (prop) === 'undefined') { return null; }
      if (typeof (prop) !== 'object') { return prop; }
      obj = prop;
    }
    return null;
  }
};

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
