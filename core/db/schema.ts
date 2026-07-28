import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

//
// 1. OBJECTEN
//
export const objects = sqliteTable("objects", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  isConfidential: integer("is_confidential", { mode: "boolean" })
    .notNull()
    .default(false),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to"),
});

//
// 2. RELATIE TYPEN (bijv. "is onderdeel van", "stuurt aan")
//
export const relations = sqliteTable("relations", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
});

//
// 3. RELATIE WAARDEN (Koppeling tussen twee objecten)
//
export const relationValues = sqliteTable("relation_values", {
  id: text("id").primaryKey(),
  relationId: text("relation_id").notNull(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  volgorde: integer("volgorde").default(0),
  isConfidential: integer("is_confidential", { mode: "boolean" })
    .notNull()
    .default(false),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to"),
});

//
// 4. PARAMETERS (Definitie van attributen/eigenschappen)
//
export const parameters = sqliteTable("parameters", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  code: text("code").notNull(),
  dataType: text("data_type").notNull(),
  unit: text("unit"),
});

//
// 5. PARAMETER WAARDEN
//
export const parameterValues = sqliteTable("parameter_values", {
  id: text("id").primaryKey(),
  parameterId: text("parameter_id").notNull(),
  targetId: text("target_id").notNull(), // Kan wijzen naar een Object OF een Relatie
  targetType: text("target_type").notNull(), // 'object' | 'relation_value'
  value: text("value").notNull(),
  isConfidential: integer("is_confidential", { mode: "boolean" })
    .notNull()
    .default(false),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to"),
});

//
// 6. CATALOGI / HULPTABELLEN
//
export const objectTypes = sqliteTable("object_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
});

export const valueTypes = sqliteTable("value_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
});

export const units = sqliteTable("units", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  symbol: text("symbol").notNull(),
});