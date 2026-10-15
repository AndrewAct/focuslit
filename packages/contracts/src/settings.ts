import { z } from "zod";

export const localeSchema = z.enum(["zh", "en"]);
export type Locale = z.infer<typeof localeSchema>;

// `locale: null` is the first-run state: the person has not chosen a language
// yet, so the UI must ask instead of guessing from the OS locale.
export const settingsViewSchema = z.strictObject({
  locale: localeSchema.nullable(),
});
export type SettingsView = z.infer<typeof settingsViewSchema>;

// Renderer → main. Only fields the person can change from the Settings view;
// choosing "no language" again is not a valid update.
export const settingsUpdateSchema = z.strictObject({
  locale: localeSchema,
});
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

export const SETTINGS_FILE_VERSION = 1;

// On-disk shape. The version lets a future schema change migrate instead of
// silently dropping a person's choices.
export const settingsFileSchema = z.strictObject({
  version: z.literal(SETTINGS_FILE_VERSION),
  locale: localeSchema,
});
export type SettingsFile = z.infer<typeof settingsFileSchema>;
