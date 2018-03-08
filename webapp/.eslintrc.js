module.exports = {
  'rules': {
    'indent': [
      'error',
      2
    ],
    'quotes': [
      'error',
      'single',
      'avoid-escape'
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'semi': [
      'error',
      'always'
    ],

    'no-console': 'off',
    'no-unused-vars': ['error', {'vars': 'all', 'args': 'none', 'ignoreRestSiblings': true}],
    'array-bracket-spacing': 'error',
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs', {'allowSingleLine': true}],
    'camelcase': 'error',
    'comma-spacing': 'error',
    'comma-style': 'error',
    'eol-last': 'error',
    'key-spacing': 'error',
    'no-spaced-func': 'error',
    'no-trailing-spaces': 'error',
    'object-curly-spacing': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', 'never'],
    'space-infix-ops': ['error', {'int32Hint': true}],
    'space-unary-ops': 'error',
    'keyword-spacing': 'error',
    'jsx-quotes': [
      'error',
      'prefer-double'
    ],

    // 'new-cap': 'error', //Disabled as lots of legacy DQX uses caps
    'arrow-body-style': 'error',
    'arrow-parens': 'error',
    'arrow-spacing': 'error',
    'no-const-assign': 'error',
    'no-dupe-class-members': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'no-cond-assign': 'error',

  },
  'env': {
    'es6': true,
    'browser': true,
    'commonjs': true
  },
  'extends': ["eslint:recommended", "plugin:react/recommended"],
  'parser': 'babel-eslint',
  'parserOptions': {
    'ecmaVersion': 6,
    'sourceType': "module",
    'ecmaFeatures': {
      'jsx': true,
      'experimentalObjectRestSpread': true
    }
  },
  'plugins': [
    'react'
  ]
};
