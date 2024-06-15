import { type Request, type Response } from 'express';
import { z } from 'zod';

const identifyBodySchema = z.object({
  contact: z.string().nullable(),
  phoneNumber: z.number().nullable(),
});

function identifyHandler(req: Request, res: Response) {
  const bodyParser = identifyBodySchema.safeParse(req.body);

  if (!bodyParser.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      error: bodyParser.error.flatten(),
    });
  }

  if (!bodyParser.data.contact && !bodyParser.data.phoneNumber) {
    return res.status(400).json({
      message: 'Missing required fields',
    });
  }

  res.status(200).json({
    message: 'Identify handler',
  });
}

export default identifyHandler;
