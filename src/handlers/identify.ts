import { type Request, type Response } from 'express';
import { z } from 'zod';
import { type DB } from '../db/connect';
import { contacts as contactsTable, type NewContact } from '../db/schema';
// import { contacts } from '../db/schema';

const identifyBodySchema = z.object({
  email: z.string().nullable(),
  phoneNumber: z.number().nullable(),
});

type IdentifyBody = z.infer<typeof identifyBodySchema>;

async function identifyHandler(req: Request, res: Response) {
  const bodyParser = identifyBodySchema.safeParse(req.body);

  if (!bodyParser.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      error: bodyParser.error.flatten(),
    });
  }

  const { email, phoneNumber } = bodyParser.data;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      message: 'Missing required fields',
    });
  }

  // get contacts where email or phone is same
  const contacts = await getContactsWithEmailOrPhone(req.db, bodyParser.data);

  // create primary contact if no contacts found
  if (contacts.length === 0) {
    const newContact = await createContact(req.db, {
      email: email,
      phoneNumber: phoneNumber ? phoneNumber.toString() : null,
      linkPrecedence: 'primary',
    });

    return marshalResponse(
      res,
      newContact[0].insertId,
      [],
      email ? [email] : [],
      phoneNumber ? [phoneNumber.toString()] : []
    );
  }

  res.status(200).json({
    message: 'Identify handler',
  });
}

function marshalResponse(
  res: Response,
  primaryId: number,
  secondaryIds: number[],
  emails: string[],
  phoneNumbers: string[]
) {
  res.status(200).json({
    contact: {
      primaryContatctId: primaryId,
      secondaryContactIds: secondaryIds,
      emails,
      phoneNumbers,
    },
  });
}

async function getContactsWithEmailOrPhone(db: DB, parsedBody: IdentifyBody) {
  const { email, phoneNumber } = parsedBody;

  if (parsedBody.email === null) {
    return db.query.contacts.findMany({
      where: (c, { eq }) => eq(c.phoneNumber, parsedBody.phoneNumber!.toString()),
    });
  } else if (parsedBody.phoneNumber === null) {
    return db.query.contacts.findMany({
      where: (c, { eq }) => eq(c.email, parsedBody.email!),
    });
  } else {
    return db.query.contacts.findMany({
      where: (c, { or, eq }) =>
        or(eq(c.email, parsedBody.email!), eq(c.phoneNumber, parsedBody.phoneNumber!.toString())),
    });
  }
}

async function createContact(db: DB, body: NewContact) {
  return await db.insert(contactsTable).values(body);
}

export default identifyHandler;
