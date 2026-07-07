/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/docusign-esign/**/*",
      "./node_modules/@devhigley/parse-proxy/**/*",
      "./node_modules/axios/**/*",
      "./node_modules/follow-redirects/**/*",
      "./node_modules/form-data/**/*",
      "./node_modules/combined-stream/**/*",
      "./node_modules/delayed-stream/**/*",
      "./node_modules/mime-types/**/*",
      "./node_modules/mime-db/**/*",
      "./node_modules/proxy-from-env/**/*",
      "./node_modules/csv-stringify/**/*",
      "./node_modules/jsonwebtoken/**/*",
      "./node_modules/jwa/**/*",
      "./node_modules/jws/**/*",
      "./node_modules/ecdsa-sig-formatter/**/*",
      "./node_modules/ms/**/*",
      "./node_modules/semver/**/*",
      "./node_modules/passport-oauth2/**/*",
      "./node_modules/oauth/**/*",
      "./node_modules/passport-strategy/**/*",
      "./node_modules/uid2/**/*",
      "./node_modules/utils-merge/**/*",
      "./node_modules/safe-buffer/**/*",
    ],
  },
};

export default nextConfig;
