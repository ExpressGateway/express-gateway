require('util.promisify/shim')();
const log = require('migrate/lib/log');
const path = require('path');
const fs = require('fs');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const access = util.promisify(fs.access);

module.exports.up = function () {
  let modelPath;
  if (process.env.EG_CONFIG_DIR) {
    log('modelPath', 'EG_CONFIG_DIR set.');
    modelPath = path.join(process.env.EG_CONFIG_DIR, 'models');
  } else {
    log('modelPath', 'EG_CONFIG_DIR not set. Guessing the config dir…');
    modelPath = path.join(__dirname, '../../../', 'config/models');
  }

  log('modelPath', `set to: ${modelPath}`);

  return access(modelPath)
    .then(() => Promise.all(
      [copyFile(path.join(__dirname, '../lib/config/models/credentials.json'), path.join(modelPath, 'credentials.json'))]
        .concat(['users', 'applications']
          .map(model => ({ modelName: model, modelDefinition: require(path.join(modelPath, model)) }))
          .map(({ modelName, modelDefinition }) => {
            const newModel = {
              $id: `http://express-gateway.io/models/${modelName}.json`,
              type: 'object',
              properties: {},
              required: []
            };

            if (modelDefinition.properties) {
              Object.entries(modelDefinition.properties).forEach(([propertyName, propertyValue]) => {
                newModel.properties[propertyName] = {
                  type: 'string'
                };

                if (propertyName === 'email') {
                  newModel.properties[propertyName].format = 'email';
                }

                if (propertyName === 'redirectUri') {
                  newModel.properties[propertyName].format = 'uri';
                }

                if (propertyValue.isRequired) {
                  newModel.required.push(propertyName);
                }
              });

              if (modelName === 'users') {
                newModel.required.push('username');
                newModel.properties.username = {
                  type: 'string'
                };
              }
            }

            return { modelName, modelDefinition: newModel };
          }).map(({ modelName, modelDefinition }) =>
            writeFile(
              path.join(modelPath, path.format({ name: modelName, ext: '.json' })),
              JSON.stringify(modelDefinition, null, 2)
            )
          )
        )
    ));
};

module.exports.down = function (next) {
  throw new Error('I\'m sorry, I can\'t make that happen');
};
