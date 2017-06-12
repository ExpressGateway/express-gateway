'use strict';

const tokens = {};

module.exports.find = (key, done) => {
  if (tokens[key]) return done(null, tokens[key]);
  return done(new Error('Token Not Found'));
};

module.exports.findByUserIdAndClientId = (userId, clientId, done) => {
  for (let x in tokens) {
    if (tokens[x].userId === userId && tokens[x].clientId === clientId) return done(null, x);
  }
  return done(new Error('Token Not Found'));
};

module.exports.save = (token, userId, clientId, done) => {
  tokens[token] = { userId, clientId };
  done();
};
