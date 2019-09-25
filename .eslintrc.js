module.exports = {
  env: {
    commonjs: true,
    es6: false,
    mocha: true,
    node: true
  },
  extends: "@rigup/eslint-config-rigup",
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    camelcase: "off",
    "max-classes-per-file": ["error", 3]
  }
};
