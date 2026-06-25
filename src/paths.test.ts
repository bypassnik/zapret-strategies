import assert from "node:assert/strict";
import path from "node:path";

import {
  buildBundleFilePath,
  buildBundleRelativePath,
  buildStrategiesFilePath,
  sanitizeFilenamePart,
} from "./paths.js";

assert.equal(sanitizeFilenamePart("1.9.8c"), "1.9.8c");
assert.equal(sanitizeFilenamePart("v1/beta"), "v1_beta");

assert.equal(
  buildStrategiesFilePath("/data/strategies", "1.9.8c"),
  path.join("/data/strategies", "1.9.8c.json"),
);

assert.equal(
  buildBundleFilePath("/data/bundles", "1.9.8c"),
  path.join("/data/bundles", "1.9.8c.zip"),
);

assert.equal(buildBundleRelativePath("1.9.9c"), "bundles/1.9.9c.zip");

console.log("paths tests ok");
