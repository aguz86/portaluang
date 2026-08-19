import { pgTable, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const appState = pgTable('app_state', {
  id: varchar('id', { length: 255 }).primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
