module.exports = (transformSpecs, egContext, obj) => {
  if (transformSpecs.add) {
    Object.keys(transformSpecs.add).forEach(addParam => { obj[addParam] = egContext.run(transformSpecs.add[addParam]); });
  }
  if (transformSpecs.remove) {
    transformSpecs.remove.forEach(removeParam => { delete obj[removeParam]; });
  }

  return obj;
};
