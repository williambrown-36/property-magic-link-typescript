import { strict as assert } from "node:assert";
import { shouldRemindInspection } from "./magic_link_property.ts";

const request = {
  tenantEmail: "tenant@example.com",
  propertyAddress: "12 Learning Lane",
  inspectionDate: "2026-11-01",
};

assert.equal(shouldRemindInspection(request, false), true);
assert.equal(shouldRemindInspection(request, true), false);
console.log("inspection reminder decision passed");
