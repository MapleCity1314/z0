import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllTemplates,
  getTemplateByType,
  validateTemplateRegistry,
} from "@/lib/project/templates/template-registry";

test("template registry validates successfully", () => {
  const validation = validateTemplateRegistry();
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
});

test("each template contains parseable package.json", () => {
  const templates = getAllTemplates();

  for (const template of templates) {
    assert.ok(template.files["package.json"]);
    assert.doesNotThrow(() => JSON.parse(template.files["package.json"]));
  }
});

test("vanilla template is registered", () => {
  const template = getTemplateByType("vanilla");
  assert.equal(template.type, "vanilla");
  assert.equal(typeof template.files["package.json"], "string");
});
