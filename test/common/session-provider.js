let data;
class Provider {
  constructor (options) {
    data = options;
  }
  ;
  on () {}
}

module.exports = function (session) {
  return Provider;
};

module.exports.getOptions = () => {
  return data;
};

module.exports.reset = () => {
  data = null;
};
