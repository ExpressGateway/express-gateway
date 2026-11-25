// Rebuild the temporary ioredis 6 compatibility package from the npm release.
// Remove the vendored package when https://github.com/stipsan/ioredis-mock/pull/1500 ships.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this script via npm run vendor:redis-mock');

const upstream = 'ioredis-mock@8.13.1';
const expectedIntegrity = 'sha512-Wsi50AU+cMiI32nAgfwpUaJVBtb4iQdVsOHl9M6R3tePCO/8vGsToCVIG82XWAxN4Se55TZoOzVseu+QngFLyw==';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-redis-mock-'));
const source = path.join(temp, 'package');
const pack = (...args) => JSON.parse(execFileSync(process.execPath, [
  npm, 'pack', '--json', '--ignore-scripts', ...args
], { encoding: 'utf8' }))[0];

try {
  const { filename, integrity } = pack(upstream, '--pack-destination', temp);
  if (integrity !== expectedIntegrity) throw new Error('Unexpected upstream npm package integrity');

  execFileSync('tar', ['-xf', path.join(temp, filename), '-C', temp,
    'package/package.json', 'package/LICENSE', 'package/lib/index.js', 'package/data/command-list.json']);

  const manifestPath = path.join(source, 'package.json');
  const { name, license, repository, dependencies } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifest = {
    name,
    version: '8.13.1-eg.1',
    license,
    repository,
    main: 'lib/index.js',
    files: ['lib/index.js', 'data/command-list.json', 'LICENSE'],
    dependencies: { ...dependencies, '@ioredis/commands': '^2.0.0' },
    peerDependencies: { ioredis: '^6.0.0' },
    engines: { node: '>=20' }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const entryPath = path.join(source, 'lib/index.js');
  const original = fs.readFileSync(entryPath, 'utf8');
  const oldCall = 'Command.transformers.reply[commandName](newResult)';
  if (original.split(oldCall).length !== 2) throw new Error('Unexpected mock reply transformer');
  const patched = original.replace(oldCall, `Command.transformers.reply[commandName](newResult, {
      commandName,
      protocol: 2,
      replyMapping: 'legacy'
    })`).replace(/^\/\/# sourceMappingURL=.*$/m, '');
  fs.writeFileSync(entryPath, patched);

  pack(source, '--pack-destination', __dirname);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
