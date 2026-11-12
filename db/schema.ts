import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const applications = sqliteTable('applications', {
 id: text('id').primaryKey(), status: text('status').notNull(), data: text('data').notNull(), created: text('created').notNull(), updated: text('updated').notNull(), note: text('note').notNull().default('')
});
export const jobs = sqliteTable('jobs', {
 id: text('id').primaryKey(), status: text('status').notNull().default('open'), data: text('data').notNull(), created: text('created').notNull(), updated: text('updated').notNull()
});
export const homepageContent = sqliteTable('homepage_content', {
 id: text('id').primaryKey(), data: text('data').notNull(), updated: text('updated').notNull()
});
export const applicationOwners = sqliteTable('application_owners', {
 applicationId:text('application_id').primaryKey(), ownerHash:text('owner_hash').notNull()
});
export const fileOwners = sqliteTable('file_owners', {
 fileKey:text('file_key').primaryKey(), ownerHash:text('owner_hash').notNull()
});
