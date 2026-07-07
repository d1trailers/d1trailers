const docuSignRuntimePackages = [
  "@devhigley/parse-proxy",
  "agent-base",
  "asynckit",
  "axios",
  "base64url",
  "buffer-equal-constant-time",
  "call-bind-apply-helpers",
  "combined-stream",
  "csv-stringify",
  "debug",
  "delayed-stream",
  "docusign-esign",
  "dunder-proto",
  "ecdsa-sig-formatter",
  "es-define-property",
  "es-errors",
  "es-object-atoms",
  "es-set-tostringtag",
  "follow-redirects",
  "form-data",
  "function-bind",
  "get-intrinsic",
  "get-proto",
  "gopd",
  "has-symbols",
  "has-tostringtag",
  "hasown",
  "https-proxy-agent",
  "jsonwebtoken",
  "jwa",
  "jws",
  "lodash.get",
  "lodash.includes",
  "lodash.isboolean",
  "lodash.isinteger",
  "lodash.isnumber",
  "lodash.isplainobject",
  "lodash.isstring",
  "lodash.once",
  "math-intrinsics",
  "mime-db",
  "mime-types",
  "ms",
  "oauth",
  "passport-oauth2",
  "passport-strategy",
  "proxy-from-env",
  "safe-buffer",
  "semver",
  "uid2",
  "utils-merge",
];

const docuSignRuntimeTraceIncludes = docuSignRuntimePackages.map(
  (packageName) => `./node_modules/${packageName}/**/*`,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/**/*": docuSignRuntimeTraceIncludes,
  },
};

export default nextConfig;
