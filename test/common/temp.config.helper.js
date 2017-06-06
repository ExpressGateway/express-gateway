const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path')

// this module is to abstract saving config files in JSON\YAML format
let fileHelper = {
  JSON: {
    readTemplate: function() {
      const configTemplateContent = fs.readFileSync(path.join(__dirname, '../fixtures/hot-reload.template.config.json'));
      return JSON.parse(configTemplateContent)
    },
    saveTempFile: (config, path) => {
      fs.writeFileSync(path, JSON.stringify(config));
    }
  },
  YAML: {
    readTemplate: function() {
      const configTemplateContent = fs.readFileSync(path.join(__dirname, '../fixtures/hot-reload.template.config.yml'));
      return yaml.load(configTemplateContent);
    },
    saveTempFile: function(config, path) {
      let text = yaml.dump(config);
      fs.writeFileSync(path, text);
    }
  }
}
module.exports = fileHelper;