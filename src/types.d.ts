import { type DB } from './db/connect';

declare global {
  namespace Express {
    interface Request {
      db: DB;
      parsedBody?: unknown;
    }
  }
}
