import {
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
  serial,
  datetime,
  unique,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';

export const contacts = mysqlTable(
  'contact',
  {
    id: int('id').autoincrement().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 25 }),
    email: varchar('email', { length: 256 }),
    linkPrecedence: mysqlEnum('link_precedence', ['primary', 'secondary']),
    linkedId: int('linked_id').references((): AnyMySqlColumn => contacts.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
    deletedAt: datetime('deleted_at'),
  },
  (contacts) => {
    return {
      phoneEmailUniqueIndex: unique().on(contacts.phoneNumber, contacts.email),
    };
  }
);

export type Contact = typeof contacts.$inferSelect;
// export {}
