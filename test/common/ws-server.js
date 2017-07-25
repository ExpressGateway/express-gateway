const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 10017 });

wss.on('connection', function connection (ws) {
  ws.on('message', function incoming (message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});
