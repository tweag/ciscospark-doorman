const gulp = require('gulp')
const $    = require('gulp-load-plugins')()

const imagesDir = 'src/images'

gulp.task('images', () =>
  gulp.src(`${imagesDir}/**/*`)
    .pipe(gulp.dest('public/images'))
)

const sassPaths = [
  'bower_components/normalize.scss/sass',
  'bower_components/foundation-sites/scss',
  'bower_components/motion-ui/src',
]

const stylesheetsDir = 'src/stylesheets'

gulp.task('sass', () =>
  gulp.src(`${stylesheetsDir}/index.s*ss`)
    .pipe(
      $.sass({
        includePaths: sassPaths,
        outputStyle: 'compressed' // if css compressed **file size**
      })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions', 'ie >= 9']
    }))
    .pipe(gulp.dest('public/stylesheets'))
)

gulp.task('watch-sass', ['sass'], () =>
  gulp.watch([`${stylesheetsDir}/**/*.scss`], ['sass'])
)


function cleanTask (name, dir) {
  gulp.task(`clean-${name}`, () =>
    gulp.src(dir, {read: false})
      .pipe($.clean())
  )
}

cleanTask('sass', 'public/stylesheets/*')
cleanTask('images', 'public/images/*')
cleanTask('transpiled', 'lib/*')

gulp.task('clean', ['clean-sass', 'clean-images', 'clean-transpiled'])

gulp.task('build', ['images', 'sass'])

gulp.task('default', ['build', 'watch-sass'])
