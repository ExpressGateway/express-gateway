const migrate = require('migrate');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

let modelPath;
if (process.env.EG_CONFIG_DIR) {
  modelPath = path.join(process.env.EG_CONFIG_DIR, 'models');
} else {
  modelPath = path.join(__dirname, '../../../', 'config/models');
}

fs.readdir(modelPath, (err, files) => {
  if (err) {
    return console.error(err);
  }

  if (files.map(f => path.parse(f).ext).some(x => x === '.json')) {
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('A migration is required to update to 1.6; Do you want to execute it now? (Y/N) ', (answer) => {
    rl.close();
    if (answer === 'Y' || answer === '') {
      migrate.load({ stateStore: path.join(__dirname, '../../../.migrate'), migrationsDirectory: path.join(__dirname, '../migrations') }, (err, set) => {
        if (err) {
          return console.error(err);
        }

        set.up('1509389756097-model-to-jsonschema.js', (err) => {
          if (err) {
            return console.error(err);
          }

          console.log('Done');
        });
      });
    }
  });
});
