const path = require('node:path');
const { Service } = require('node-windows');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'dist', 'src', 'index.js');
const service = new Service({
  name: 'Crazy Bot',
  description: 'Konfigurierbarer Discord-Bot und Web-Dashboard',
  script,
  workingDirectory: root,
  env: [{ name: 'NODE_ENV', value: 'production' }]
});

const action = process.argv[2];
if (action === 'install') {
  service.on('install', () => service.start());
  service.on('alreadyinstalled', () => {
    console.log('Dienst ist bereits installiert.');
    process.exit(0);
  });
  service.install();
} else if (action === 'uninstall') {
  service.on('uninstall', () => {
    console.log('Dienst wurde entfernt.');
    process.exit(0);
  });
  service.uninstall();
} else {
  console.error('Nutzung: node scripts/service.cjs install|uninstall');
  process.exit(1);
}
