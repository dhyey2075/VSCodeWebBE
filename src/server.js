import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { attachWsServer } from './websocket/ws.server.js';
import { startContainerInactivityCleanup } from './modules/execution/container.inactivity.js';

const httpServer = http.createServer(app);
attachWsServer(httpServer);

startContainerInactivityCleanup();

httpServer.listen(env.port, () => {
  console.log(`Server is running on port ${env.port} 🚀`);
});
