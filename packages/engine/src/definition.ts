/** The JSON shape describing a dataset: what it reads from Tally and how the API exposes it. */
import { z } from "zod";

export const FIELD_TYPES = ["text", "number", "amount", "quantity", "rate", "date", "logical"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const PRIVACY = ["public", "masked", "excluded"] as const;
export type Privacy = (typeof PRIVACY)[number];

export const FieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/),
  /** Upper-case tag in Tally's response. */
  tag: z.string(),
  /** Name of the TDL FIELD object inside the template. */
  tdlField: z.string(),
  expr: z.string().max(400),
  type: z.enum(FIELD_TYPES),
  privacy: z.enum(PRIVACY).default("public"),
  custom: z.boolean().default(false),
  udfIndex: z.number().int().optional(),
  udfType: z.string().optional(),
  udfName: z.string().optional(),
});
export type FieldDef = z.infer<typeof FieldSchema>;

export interface LineDef {
  name: string;
  tag: string;
  tdlLine: string;
  fields: FieldDef[];
  lines: LineDef[];
}
export const LineSchema: z.ZodType<LineDef> = z.lazy(() =>
  z.object({ name: z.string(), tag: z.string(), tdlLine: z.string(), fields: z.array(FieldSchema), lines: z.array(LineSchema) }),
) as never;

export const DatasetSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  kind: z.enum(["master", "voucher", "custom"]),
  title: z.string(),
  /** Upper-case tag of one row in Tally's response. */
  rowTag: z.string(),
  tdlLine: z.string(),
  tdlCollection: z.string(),
  /** How a full pull is split so Tally never builds a whole company in one response. */
  paging: z.enum(["date", "masterId", "none"]),
  /** System variable for voucher datasets, e.g. $$VchTypeReceipt. */
  voucherVar: z.string().optional(),
  template: z.string(),
  keysTemplate: z.string(),
  fields: z.array(FieldSchema),
  lines: z.array(LineSchema),
});
export type DatasetDef = z.infer<typeof DatasetSchema>;

export interface Pack { name: string; version: number; datasets: DatasetDef[]; companiesRequest: string }

/** Fields every row carries for licensing. Read by the connector and never exposed by the API. */
export const INTERNAL_TAGS = new Set(["TALLYSERIAL", "COMPANYID", "COMPANYNAME"]);
export const IDENTITY_TAGS = new Set(["MASTERID", "ALTERID"]);
