const path = require('path');
const fs = require('fs');
const util = require('util');
require('util.promisify');

const writeFile = util.promisify(fs.writeFile);

module.exports.up = function () {
  return Promise.all(['users', 'applications']
    .map(model => ({ modelName: model, modelDefinition: require(path.join(process.env.EG_CONFIG_DIR, model)) }))
    .map(({ modelName, modelDefinition }) => {
      const newModel = {
        type: 'object',
        properties: {},
        required: []
      };

      if (modelDefinition.properties) {
        Object.entries(modelDefinition.properties).forEach(([propertyName, propertyValue]) => {
          newModel.properties[propertyName] = {
            type: 'string'
          };

          if (propertyValue.isRequired) {
            newModel.required.push(propertyName);
          }
        });
      }

      return { modelName, modelDefinition: newModel };
    }).map(({ modelName, modelDefinition }) => writeFile(path.join(process.env.EG_CONFIG_DIR, modelName), modelDefinition)));
};

module.exports.down = function (next) {
  throw new Error('I\'m sorry, I can\'t make that happen');
};
