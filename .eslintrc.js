module.exports = {
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: {
      jsx: true
    },
  },
  extends: 'airbnb',
  env: {
    node: true,
    commonjs: true,
    mocha: true,
    es6: true
  },

  /**
   * {@link https://github.com/benmosher/eslint-plugin-import/issues/275}
   * {@link https://github.com/benmosher/eslint-plugin-import#importcore-modules}
   */
  settings: {
    'import/core-modules': ['electron'],
  },
  rules: {
    strict: [0, 'global'], // required for node, configurable for browser, https://github.com/eslint/eslint/issues/2785#issuecomment-113254153
    'arrow-body-style': 0,
    'consistent-return': 0,
    'no-param-reassign': 0,
    'no-shadow': 0,
    'no-underscore-dangle':0,
  }
};
