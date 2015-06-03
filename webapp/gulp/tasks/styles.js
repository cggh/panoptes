var gulp = require('gulp');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var connect = require('gulp-connect');
var config = require('../config.js').sass;

gulp.task('styles', function() {
  gulp.src(config.src)
    .pipe(sass(config.settings))
    .pipe(prefix("last 1 version", "> 1%"))
    .pipe(gulp.dest(config.dest))
    .pipe(connect.reload());
});
