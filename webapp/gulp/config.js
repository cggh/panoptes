var dest = './dist';
var src = './src';
var gutil = require('gulp-util');

module.exports = {
  server: {
    settings: {
      root: dest,
      host: 'localhost',
      port: 8080,
      livereload: {
        port: 35929
      }
    }
  },
  sass: {
    src: src + '/styles/**/*.{sass,scss,css}',
    dest: dest + '/styles',
    settings: {
      indentedSyntax: false, // Enable .sass syntax?
      imagePath: '/images' // Used by the image-url helper
    }
  },
  browserify: {
    settings: {
      transform: [["reactify", {"es6": true}], 'babelify']
    },
    src: src + '/js/index.js',
    dest: dest + '/js',
    outputName: 'index.js',
    debug: gutil.env.type === 'dev'
  },
  html: {
    src: 'src/index.html',
    dest: dest
  },
  fonts: {
    src: 'src/fonts/**/*.{ttf,woff,woff2,eof,svg}',
    dest: dest+'/fonts'
  },
  watch: {
    src: 'src/**/*.*',
    tasks: ['build']
  }
};


