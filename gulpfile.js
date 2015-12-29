var gulp          = require('gulp'),
    tslint        = require('gulp-tslint'),
    exec          = require('child_process').exec,
    gulp          = require('gulp-help')(gulp),
    tsconfig      = require('gulp-tsconfig-files'),
    path          = require('path'),
    inject        = require('gulp-inject'),
    gulpSequence  = require('gulp-sequence'),
    rename        = require('gulp-rename'),
    del           = require('del');

var tsFilesGlob = (function (c) {
  return c.filesGlob || c.files || '**/*.ts';
})(require('./tsconfig.base.json'));

gulp.task('tsconfig_files', 'Update files section in tsconfig.json', function () {
  gulp.src('tsconfig.base.json')
    .pipe(rename('tsconfig.json'))
    .pipe(gulp.dest('.'));
  gulp.src(tsFilesGlob).pipe(tsconfig());
});

gulp.task('gen_tsrefs', 'Generates the app.d.ts references file dynamically for all application *.ts files', function () {
  var target = gulp.src(path.join('.', "typings", 'app.d.ts'));
  var sources = gulp.src([path.join('.', 'src', '**', '*.ts')], { read: false });
  return target.pipe(inject(sources, {
    starttag: '//{',
    endtag: '//}',
    transform: function (filepath) {
      return '/// <reference path="..' + filepath + '" />';
    }
  })).pipe(gulp.dest(path.join('.', "typings")));
});

gulp.task('clean', 'Cleans the generated js files from lib directory', function () {
  return del([
    'client/lib/**/*'
  ]);
});

gulp.task('tslint', 'Lints all TypeScript source files', function () {
  return gulp.src(tsFilesGlob)
    .pipe(tslint())
    .pipe(tslint.report('verbose'));
});

gulp.task('_build', 'INTERNAL TASK - Compiles all TypeScript source files', function (cb) {
  exec('tsc', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

//run tslint task, then run _tsconfig_files and _gen_tsrefs in parallel, then run _build
gulp.task('build', 'Compiles all TypeScript source files and updates module references', gulpSequence('tslint', ['tsconfig_files', 'gen_tsrefs'], '_build'));
