module.exports = {
  version: '1.0.0',
  description: 'A test plugin',
  init: function (pluginContext) {
  },
  policies: ['policy1', 'policy2'],
  options: {
    foo: {
      title: 'Foo',
      description: 'the foo to initialize',
      type: 'string',
      required: true
    },
    baz: {
      title: 'Baz',
      description: 'the starting baz value',
      type: 'number'
    }
  }
};
