import app from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Graceful shutdown
process.on('unhandledRejection', (reason: Error) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection:', reason.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error: Error) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', error.message);
  server.close(() => process.exit(1));
});

export default server;
