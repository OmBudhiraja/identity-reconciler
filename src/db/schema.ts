import {
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
  timestamp,
  unique,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';

export const contacts = mysqlTable(
  'contact',
  {
    id: int('id').autoincrement().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 25 }),
    email: varchar('email', { length: 256 }),
    linkPrecedence: mysqlEnum('link_precedence', ['primary', 'secondary']).notNull(),
    linkedId: int('linked_id').references((): AnyMySqlColumn => contacts.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (contacts) => {
    return {
      phoneEmailUniqueIndex: unique().on(contacts.phoneNumber, contacts.email),
    };
  }
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
// export {}
