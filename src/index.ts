import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import connectDb, { type DB } from './db/connect';
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

  app.get('/', async (req, res) => {
    res.json({
      message: 'Hello World!',
    });
  });

  app.get('/contacts', handler);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

const handler = async (req: Request, res: Response) => {
  const cons = await req.db.query.contacts.findMany();

  res.json({
    contacts: cons,
  });
};

main();
