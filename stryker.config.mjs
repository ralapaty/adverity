/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  mutate: ["src/domain/**/*.ts", "!src/domain/**/*.test.ts"],
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: 50 },
  concurrency: 4,
};

export default config;
