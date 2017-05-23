'user strict';

// let Promise = require('bluebird');

module.exports = {
  appendCreatedAt: appendCreatedAt,
  appendUpdatedAt: appendUpdatedAt
}

function appendCreatedAt(obj) {
  obj['createdAt'] = String(new Date());
}

function appendUpdatedAt(obj) {
  obj['updatedAt'] = String(new Date());
}