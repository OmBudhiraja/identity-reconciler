import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import connectDb from './db/connect';
import indentifyHandler from './handlers/identify';
import { validateIdentifyRequest } from './middleware/validation';

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
      message: 'Access the POST /identify endpoint to identify a contact',
    });
  });

  app.post('/identify', validateIdentifyRequest, indentifyHandler);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main();
