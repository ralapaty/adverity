import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["coverage/**", ".next/**", "reports/**", "playwright-report/**", "test-results/**", ".stryker-tmp/**", "data/**"] },
  ...nextCoreWebVitals,
];

export default config;
