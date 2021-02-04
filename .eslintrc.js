module.exports = {
  env: {
    es6: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    ecmaVersion: 6,
    ecmaFeatures: {
      impliedStrict: true
    },
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "max-len": ["error", { "code": 300 }],
    "require-await": "off",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "semi": "off",
    "no-cond-assign": "off",
    "no-constant-condition": "off",
    "@typescript-eslint/no-empty-function": ["off"],
    "@typescript-eslint/semi": ["error"],
    "@typescript-eslint/explicit-function-return-type": ["error"],
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/indent": ["error", 4],
    "@typescript-eslint/no-non-null-assertion": "off"
  }
};
