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

    'no-console': 0,

    'array-bracket-spacing': 2,
    'block-spacing': 2,
    'brace-style': [2, '1tbs', {'allowSingleLine': true}],
    'camelcase': 2,
    'comma-spacing': 2,
    'comma-style': 2,
    'eol-last': 2,
    'key-spacing': 2,
    'no-spaced-func': 2,
    'no-trailing-spaces': 2,
    'object-curly-spacing': 2,
    'space-after-keywords': 2,
    'space-before-blocks': 2,
    'space-before-function-paren': [2, 'never'],
    'space-before-keywords': 2,
    'space-infix-ops': [2, {'int32Hint': true}],
    'space-return-throw-case': 2,
    'space-unary-ops': 2,

    'jsx-quotes': [
      2,
      'prefer-double'
    ],

    //'new-cap': 2, //Disabled as lots of legacy DQX uses caps
    'arrow-body-style': 2,
    'arrow-parens': 2,
    'arrow-spacing': 2,
    'no-const-assign': 2,
    'no-dupe-class-members': 2,
    'no-var': 2,
    'prefer-arrow-callback': 2

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
