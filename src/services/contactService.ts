import { SQL, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { contacts as contactsTable, type NewContact } from '../db/schema';
import { type DB } from '../db/connect';

export async function getContactsWithEmailOrPhone(
  db: DB,
  parsedBody: { email?: string; phoneNumber?: number }
) {
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

export async function getContactWithLinkedId(db: DB, linkedIds: number[]) {
  return db
    .select({
      id: contactsTable.id,
      phoneNumber: contactsTable.phoneNumber,
      email: contactsTable.email,
      linkPrecedence: contactsTable.linkPrecedence,
      linkedId: contactsTable.linkedId,
    })
    .from(contactsTable)
    .where(inArray(contactsTable.linkedId, linkedIds));
}

export async function createContact(db: DB, body: NewContact) {
  return db.insert(contactsTable).values(body);
}

export async function updateContactWithLinkedId(db: DB, ids: number[], data: NewContact) {
  return db.update(contactsTable).set(data).where(inArray(contactsTable.id, ids));
}
