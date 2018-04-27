require('./eventBus'); // init event bus
const pluginsLoader = require('./plugins');
if (require.main === module) {
  const config = require('./config'); // this is to init config before loading servers and plugins
  const plugins = pluginsLoader.load({config});
  require('./gateway')({plugins, config});
  require('./rest')({plugins, config});
} else { // Loaded as module (e.g. if "eg gateway create" generated code )
  class Main {
    constructor () {
      this.configPath = null;
    }

    load (configPath) {
      this.configPath = configPath;
      process.env.EG_CONFIG_DIR =
      this.configPath || process.env.EG_CONFIG_DIR;
      this.config = require('./config'); // this is to init config before loading servers and plugins
      return this;
    }

    run () {
      const plugins = pluginsLoader.load({config: this.config});
      require('./gateway')({plugins, config: this.config});
      require('./rest')({plugins, config: this.config});

      return this;
    }
  }

  module.exports = () => {
    return new Main();
  };
}
