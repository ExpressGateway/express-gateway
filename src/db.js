'use strict';

let redis = require('redis');
let Promise = require('bluebird');
let db;

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

module.exports = function(host, port) {
  // Instantiate db only once
  if (db) {
    return db;
  }

  db = redis.createClient({host: host, port: port});

  db.on('ready',function() {
   console.log('Redis is ready');
  });

  db.on('error',function(err) {
   console.log('Error in Redis: ', err);
  });

  db.getConfig

  return db;
}