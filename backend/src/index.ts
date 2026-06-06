import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './socket';
import { checkPendingCompletions } from './utils/completionChecker';

const PORT = process.env.PORT ?? 3000;

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Check for stale completions every hour
  setInterval(() => void checkPendingCompletions(), 60 * 60 * 1000);
  // Run once on startup after a short delay
  setTimeout(() => void checkPendingCompletions(), 10_000);
});
