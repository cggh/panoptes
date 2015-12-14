module.exports = {
  'rules': {
    'indent': [
      2,
      2
    ],
    'quotes': [
      2,
      'single',
      'avoid-escape'
    ],
    'linebreak-style': [
      2,
      'unix'
    ],
    'semi': [
      2,
      'always'
    ],
    'no-console': 0
  },
  'env': {
    'es6': true,
    'browser': true,
    'commonjs': true
  },
  'extends': 'eslint:recommended',
  'ecmaFeatures': {
    'modules': true,
    'jsx': true,
    'experimentalObjectRestSpread': true
  },
  'plugins': [
    'react'
  ]
};
