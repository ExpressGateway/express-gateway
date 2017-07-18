if (require.main === module) {
  require('./gateway')();
  require('./rest')();
} else {
  class Main {
    constructor () {
      this.configPath = null;
    }

    load (configPath) {
      this.configPath = configPath;
      return this;
    }

    run () {
      process.env.EG_CONFIG_DIR =
        this.configPath || process.env.EG_CONFIG_DIR;

      require('./gateway')();
      require('./rest')();

      return this;
    }
  }

  module.exports = () => {
    return new Main();
  };
}
