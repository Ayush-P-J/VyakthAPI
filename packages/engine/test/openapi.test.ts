import { describe, expect, it } from "vitest";
import { addCustomField, generateOpenApi, standardPack } from "../src/index.ts";

const document = () => generateOpenApi({ connectionId: "company-connection", version: 3, datasets: standardPack.datasets }) as any;

describe("connection OpenAPI contract", () => {
  it("gives write clients complete input contracts rather than normalized read shapes", () => {
    const doc = document();
    const receipt = doc.paths["/v1/connections/{id}/receipts"];
    expect(receipt.post.requestBody.content["application/json"].schema.$ref).toBe("#/components/schemas/VoucherInput");
    expect(doc.components.schemas.VoucherInput.required).toEqual(["date", "entries"]);
    expect(doc.components.schemas.VoucherInput.properties.entries).toMatchObject({ minItems: 2, maxItems: 500 });
    expect(doc.components.schemas.LedgerInput.required).toEqual(["name", "parent"]);
    expect(doc.paths["/v1/connections/{id}/ledgers/{recordId}"].patch.requestBody.content["application/json"].schema.$ref).toBe("#/components/schemas/LedgerInput");
  });

  it("limits documented writes to implemented datasets and distinguishes validation from enqueueing", () => {
    const doc = document();
    expect(doc.paths["/v1/connections/{id}/sales"].post).toBeUndefined();
    expect(doc.paths["/v1/connections/{id}/sales:validate"]).toBeUndefined();
    const create = doc.paths["/v1/connections/{id}/receipts"].post;
    const validate = doc.paths["/v1/connections/{id}/receipts:validate"].post;
    expect(create.responses[202]).toBeDefined();
    expect(create.parameters.find((p: any) => p.name === "Idempotency-Key").required).toBe(true);
    expect(validate.parameters.some((p: any) => p.name === "Idempotency-Key")).toBe(false);
    expect(validate.responses[200].content["application/json"].schema.$ref).toBe("#/components/schemas/ValidationResult");
  });

  it("documents bounded live reads, synced cursors and single-record query controls", () => {
    const doc = document();
    const list = doc.paths["/v1/connections/{id}/receipts"].get;
    expect(list.parameters.map((p: any) => p.name)).toEqual(expect.arrayContaining(["cursor", "limit", "fields", "live", "includeDeleted", "from", "to"]));
    expect(list.responses[200].content["application/json"].schema.properties).toHaveProperty("truncated");
    expect(doc.paths["/v1/connections/{id}/receipts/{recordId}"].get.parameters.map((p: any) => p.name)).toEqual(expect.arrayContaining(["live", "fields"]));
  });

  it("keeps each published contract bound to its connection and custom fields", () => {
    const ledgers = standardPack.datasets.find((d) => d.name === "ledgers")!;
    const custom = addCustomField(ledgers, { name: "memberReference", expr: "$MemberReference", type: "text", privacy: "masked" });
    const maskedDate = addCustomField(custom, { name: "memberDate", expr: "$MemberDate", type: "date", privacy: "masked" });
    const doc: any = generateOpenApi({ connectionId: "specific-company", version: 7, datasets: [maskedDate] });
    expect(doc.paths["/v1/connections/{id}/ledgers"].get.parameters[0].schema.const).toBe("specific-company");
    expect(doc.components.schemas.ledgers.allOf[1].properties.memberReference.description).toContain("Masked");
    // A masked ISO date is a string such as "******1-01", not a valid OpenAPI date.
    expect(doc.components.schemas.ledgers.allOf[1].properties.memberDate.format).toBeUndefined();
    expect(doc.info.version).toBe("7");
  });
});
