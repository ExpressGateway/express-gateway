const passport = require('passport');
const util = require('util');

function Strategy (options, verify) {
  if (typeof options === 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('local authentication strategy requires a verify function');

  this._apiKeyField = options.apiKeyField;
  this._apiKeyHeader = options.apiKeyHeader;
  this._apiKeyHeaderScheme = options.apiKeyHeaderScheme;

  passport.Strategy.call(this);
  this.name = 'localapikey';
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;
}

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function (req, options) {
  options = options || {};
  let apikey;

  if (!options.disableHeaders) {
    apikey = lookup(req.headers, (options.apiKeyHeader || this._apiKeyHeader || '').toLowerCase());
    if (apikey) {
      const parts = apikey.split(' ');
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

  if (!apikey) {
    return this.fail(new Error(options.badRequestMessage || 'Missing API Key'));
  }

  const self = this;

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
    const chain = field.split(']').join('').split('[');
    for (let i = 0, len = chain.length; i < len; i++) {
      const prop = obj[chain[i]];
      if (typeof (prop) === 'undefined') { return null; }
      if (typeof (prop) !== 'object') { return prop; }
      obj = prop;
    }
    return null;
  }
};

module.exports = Strategy;
