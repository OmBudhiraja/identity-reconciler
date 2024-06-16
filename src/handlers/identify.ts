import { type Request, type Response } from 'express';
import { z } from 'zod';
import { type DB } from '../db/connect';
import { type Contact, contacts as contactsTable, type NewContact } from '../db/schema';
import { SQL, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';

const identifyBodySchema = z.object({
  email: z.string().optional(),
  phoneNumber: z.number().optional(),
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
      email: email ?? null,
      phoneNumber: phoneNumber?.toString() ?? null,
      linkPrecedence: 'primary',
    });

    return marshalResponse(
      res,
      {
        id: newContact[0].insertId,
        email: email,
        phoneNumber: phoneNumber?.toString(),
        linkPrecedence: 'primary',
      },
      []
    );
  }

  const primaryContacts: Partial<Contact>[] = [];

  for (const contact of contacts) {
    if (contact.linkPrecedence === 'primary') {
      primaryContacts.push(contact);
      continue;
    }

    if (
      contact.linkPrecedence === 'secondary' &&
      contact.linkedContact &&
      primaryContacts.findIndex((c) => c.id === contact.linkedContact!.id) === -1
    ) {
      primaryContacts.push(contact.linkedContact);
    }
  }

  if (primaryContacts.length === 0) {
    return res.status(500).json({
      message: 'Primary contact not found',
    });
  }

  const secondaryContracts = await getContactWithLinkedId(
    req.db,
    primaryContacts.map((c) => c.id!)
  );

  // one primary contact should turn into secondary contact
  if (primaryContacts.length > 1) {
    // TODO: handle this case by updating the linkPrecedence of one primary contact to secondary
    // and also all the secondary contacts linkedId to the new primary contact
  }

  // if email or phone exists in any contact
  let emailFound = false;
  let phoneFound = false;

  primaryContacts.concat(secondaryContracts).forEach((c) => {
    if (email && c.email === email) {
      emailFound = true;
    }
    if (phoneNumber && c.phoneNumber === phoneNumber.toString()) {
      phoneFound = true;
    }
  });

  // if email or phone was not null and not found in any contact
  // create a new secondary contact
  if ((!emailFound && email) || (!phoneFound && phoneNumber)) {
    const newSecondaryContact = await createContact(req.db, {
      email: email,
      phoneNumber: phoneNumber?.toString() ?? null,
      linkPrecedence: 'secondary',
      linkedId: primaryContacts[0].id,
    });

    secondaryContracts.push({
      id: newSecondaryContact[0].insertId,
      email: email ?? null,
      phoneNumber: phoneNumber?.toString() ?? null,
      createdAt: new Date(),
      linkPrecedence: 'secondary',
      linkedId: primaryContacts[0].id!,
    });
  }

  marshalResponse(res, primaryContacts[0], secondaryContracts);
}

function marshalResponse(
  res: Response,
  primaryContact: Partial<Contact>,
  secondaryContacts: Partial<Contact>[]
) {
  const emails = [primaryContact.email, ...secondaryContacts.map((c) => c.email)].filter(Boolean);
  const uniqueEmails = Array.from(new Set(emails));

  const phoneNumbers = [
    primaryContact.phoneNumber,
    ...secondaryContacts.map((c) => c.phoneNumber),
  ].filter(Boolean);

  const uniquePhoneNumbers = Array.from(new Set(phoneNumbers));

  res.status(200).json({
    contact: {
      primaryContatctId: primaryContact.id,
      secondaryContactIds: secondaryContacts.map((c) => c.id),
      emails: uniqueEmails,
      phoneNumbers: uniquePhoneNumbers,
    },
  });
}

async function getContactsWithEmailOrPhone(db: DB, parsedBody: IdentifyBody) {
  const { email, phoneNumber } = parsedBody;

  const filters: SQL[] = [];

  if (email !== undefined) {
    filters.push(eq(contactsTable.email, email));
  }

  if (phoneNumber !== undefined) {
    filters.push(eq(contactsTable.phoneNumber, phoneNumber.toString()));
  }

  const linkedContact = alias(contactsTable, 'linkedContact');

  return db
    .select({
      id: contactsTable.id,
      phoneNumber: contactsTable.phoneNumber,
      email: contactsTable.email,
      linkPrecedence: contactsTable.linkPrecedence,
      linkedId: contactsTable.linkedId,
      createdAt: contactsTable.createdAt,
      linkedContact: {
        id: linkedContact.id,
        email: linkedContact.email,
        phoneNumber: linkedContact.phoneNumber,
        linkPrecedence: linkedContact.linkPrecedence,
        linkedId: linkedContact.linkedId,
        createdAt: linkedContact.createdAt,
      },
    })
    .from(contactsTable)
    .where(or(...filters))
    .leftJoin(linkedContact, eq(contactsTable.linkedId, linkedContact.id));
}

async function getContactWithLinkedId(db: DB, linkedIds: number[]) {
  return db
    .select({
      id: contactsTable.id,
      phoneNumber: contactsTable.phoneNumber,
      email: contactsTable.email,
      linkPrecedence: contactsTable.linkPrecedence,
      linkedId: contactsTable.linkedId,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .where(inArray(contactsTable.linkedId, linkedIds));
}

async function createContact(db: DB, body: NewContact) {
  return db.insert(contactsTable).values(body);
}

export default identifyHandler;
