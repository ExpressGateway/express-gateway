'use strict';

function run(context, [functionName, ...args]) {
  const func = CONDITIONALS[functionName];
  if (!func) {
    return null;
  } else {
    return func(context, ...args);
  }
};

const CONDITIONALS = module.exports = {
  run,

  always: function(_req) {
    return true;
  },

  never: function(_req) {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" conditional, and is useful during tests.
    return false;
  },

  allOf: function(req, ...subItems) {
    return subItems.every(subItem => run(req, subItem));
  },

  oneOf: function(req, ...subItems) {
    return subItems.some(subItem => run(req, subItem));
  },

  not: function(req, subItem) {
    return !run(req, subItem);
  },

  pathMatch: function(req, pattern) {
    return req.originalUrl.match(new RegExp(pattern)) != null;
  },

  pathExact: function(req, path) {
    return req.originalUrl === path;
  },

  method: function(req, method) {
    if (Array.isArray(method)) {
      return method.includes(req.method);
    } else {
      return req.method === method;
    }
  },

  authScope: function(_req, _scope) {
    return false;
  }
};
