import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import connectDb from './db/connect';
import indentifyHandler from './handlers/identify';
import { validateIdentifyRequest } from './middleware/validation';
import { contacts } from './db/schema';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

async function main() {
  const db = await connectDb();

  // pass db instance to the request object
  app.use((req, _, next) => {
    req.db = db;
    next();
  });

  // global middleware to handle invalid JSON

  app.get('/', async (req, res) => {
    res.json({
      message: 'Access the POST /identify endpoint to identify a contact',
    });
  });

  app.get('/contacts', async (req, res) => {
    const rows = await req.db.select().from(contacts);
    res.json(rows);
  });

  app.get('/identify', async (req, res) => {
    res.json({
      message: 'Access the POST /identify endpoint to identify a contact',
    });
  });

  app.post('/identify', validateIdentifyRequest, indentifyHandler);

  app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    next();
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main();
