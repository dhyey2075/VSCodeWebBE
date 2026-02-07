import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { attachWsServer } from './websocket/ws.server.js';

const httpServer = http.createServer(app);
attachWsServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Server is running on port ${env.port} 🚀`);
});
