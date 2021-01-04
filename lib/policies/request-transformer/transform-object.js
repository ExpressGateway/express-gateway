const np = require('nested-property');
module.exports = (transformSpecs, egContext, obj) => {
  if (transformSpecs.add) {
    Object.keys(transformSpecs.add).forEach(addParam => { np.set(obj, addParam, egContext.run(transformSpecs.add[addParam])); });
  }
  if (transformSpecs.remove) {
    transformSpecs.remove.forEach(removeParam => { delete obj[removeParam]; });
  }

  return obj;
};
