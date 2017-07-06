/* eslint-disable no-console */

// Modified content.  Original:
//   https://github.com/yargs/yargs/blob/a6070619b85d8d1662afbb26ca45585dae2620ec/test/helpers/utils.js

// capture terminal output, so that we might
// assert against it.
exports.checkOutput = function (f, argv, cb) {
  let exit = false;
  let _exit = process.exit;
  let _emit = process.emit;
  let _env = process.env;
  let _argv = process.argv;
  let _error = console.error;
  let _log = console.log;
  let _warn = console.warn;

  process.exit = function () { exit = true; };
  process.env = Object.assign(process.env, { _: 'node' });
  process.argv = argv || [ './usage' ];

  let errors = [];
  let logs = [];
  let warnings = [];

  console.error = function (msg) { errors.push(msg); };
  console.log = function (msg) { logs.push(msg); };
  console.warn = function (msg) { warnings.push(msg); };

  let result;

  if (typeof cb === 'function') {
    process.exit = function () {
      exit = true;
      cb(null, done());
    };
    process.emit = function (ev, value) {
      if (ev === 'uncaughtException') {
        done();
        cb(value);
        return true;
      }

      return _emit.apply(this, arguments);
    };

    f();
  } else {
    try {
      result = f();
    } finally {
      reset();
    }

    return done();
  }

  function reset () {
    process.exit = _exit;
    process.emit = _emit;
    process.env = _env;
    process.argv = _argv;

    console.error = _error;
    console.log = _log;
    console.warn = _warn;
  }

  function done () {
    reset();

    return {
      errors: errors,
      logs: logs,
      warnings: warnings,
      exit: exit,
      result: result
    };
  }
};
