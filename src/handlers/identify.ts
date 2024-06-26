import { type Request, type Response } from 'express';

import { type Contact, type NewContact } from '../db/schema';
import { type IdentifyBody } from '../middleware/validation';
import {
  createContact,
  getContactsWithEmailOrPhone,
  getContactWithLinkedId,
  updateContactWithLinkedId,
} from '../services/contactService';

async function identifyHandler(req: Request, res: Response) {
  const body = req.parsedBody as IdentifyBody;
  const { email, phoneNumber } = body;

  // get contacts where email or phone is same
  const contacts = await getContactsWithEmailOrPhone(req.db, body);

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
  let primaryContact: Partial<Contact>;

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

  // this should never happen, since one of the primary contacts should be linked to the secondary contact
  if (primaryContacts.length === 0) {
    return res.status(500).json({
      message: 'Primary contact not found',
    });
  }

  const secondaryContacts = await getContactWithLinkedId(
    req.db,
    primaryContacts.map((c) => c.id!)
  );

  // one primary contact should turn into secondary contact and its linkedId should be updated
  if (primaryContacts.length > 1) {
    primaryContact = primaryContacts.sort(
      (a, b) => (a.createdAt?.valueOf() ?? 0) - (b.createdAt?.valueOf() ?? 0)
    )[0];

    const primaryContactIdsToUpdate: number[] = [];
    const secondaryContactIdsToUpdate: number[] = [];

    for (const secondaryContact of secondaryContacts) {
      if (secondaryContact.linkedId !== primaryContact.id) {
        secondaryContactIdsToUpdate.push(secondaryContact.id!);
      }
    }

    for (let i = 1; i < primaryContacts.length; i++) {
      primaryContactIdsToUpdate.push(primaryContacts[i].id!);
      secondaryContacts.push({
        id: primaryContacts[i].id!,
        email: primaryContacts[i].email ?? null,
        phoneNumber: primaryContacts[i].phoneNumber ?? null,
        linkPrecedence: 'secondary',
        linkedId: primaryContact.id!,
      });
    }

    await updateContactWithLinkedId(
      req.db,
      primaryContactIdsToUpdate.concat(secondaryContactIdsToUpdate),
      {
        linkPrecedence: 'secondary',
        linkedId: primaryContact.id,
        updatedAt: new Date(),
      }
    );
  } else {
    primaryContact = primaryContacts[0];
  }

  // if email or phone exists in any contact
  let emailFound = false;
  let phoneFound = false;

  primaryContacts.concat(secondaryContacts).forEach((c) => {
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
    const data: NewContact = {
      email: email ?? null,
      phoneNumber: phoneNumber?.toString() ?? null,
      linkPrecedence: 'secondary',
      linkedId: primaryContact.id,
    };

    const newSecondaryContact = await createContact(req.db, data);

    data.id = newSecondaryContact[0].insertId;

    secondaryContacts.push(data as Contact);
  }

  marshalResponse(res, primaryContact, secondaryContacts);
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

export default identifyHandler;
