import { z } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';

const identifyBodySchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.number().optional(),
});

export type IdentifyBody = z.infer<typeof identifyBodySchema>;

export function validateIdentifyRequest(req: Request, res: Response, next: NextFunction) {
  const bodyParser = identifyBodySchema.safeParse(req.body);

  if (!bodyParser.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      error: bodyParser.error.flatten(),
    });
  }

  if (!bodyParser.data.email && !bodyParser.data.phoneNumber) {
    return res.status(400).json({
      message: 'Either email or phoneNumber is required',
    });
  }

  req.parsedBody = bodyParser.data;

  next();
}
