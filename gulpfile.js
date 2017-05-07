var gulp = require('gulp');
var webpack = require('webpack');
var webpackConfig = require('./webpack.config');
var ts = require('gulp-typescript');
var sass = require('gulp-sass');
var nodemon = require('nodemon');

// Set up TypeScript project
var tsProject = ts.createProject('tsconfig.json');

// Hold a reference to our webpack watcher so that we can close it later.
var watcher;

////////////////////////////// Gulp Tasks

gulp.task('default', ['webpack-watch', 'sass-watch', 'tsc-watch', 'start-server'], function () {
    console.log("Testing gulp!");
    setupGracefulExit();
});

gulp.task('sass', function () {
    return gulp.src('./src/client/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./public'));
});

gulp.task('sass-watch', function () {
    gulp.watch('./src/client/sass/**/*.scss', ['sass']);
});

gulp.task('tsc-watch', function () {
    gulp.watch('./src/server/**/*', ['tsc']);
});

gulp.task('tsc', function () {
    var tsResult = gulp.src('./src/server/**/*').pipe(tsProject());
    return tsResult.js.pipe(gulp.dest('build'));
});

gulp.task('webpack-watch', function () {
    var compiler = webpack(webpackConfig);
    watcher = compiler.watch({}, function (err, stats) {
        console.log(stats.toString({
            chuncks: false,
            colors: true
        }));
    });
});

gulp.task('start-server', function () {
    var server = nodemon({
        script: './build/book-club-server.js'
    });
    server.on('log', function (data) {
        console.log(data.colour);
    });
});

// Since we're using the webpack node.js API, we need to be able to catch CTRL-C and cleanly exit. We will also exit from nodemon at the same time.
// gulp-sass and gulp-typescript also watch, but they exit when gulp does.
function setupGracefulExit() {
    if (process.platform === "win32") {
        require("readline")
            .createInterface({
            input: process.stdin,
            output: process.stdout
            })
            .on("SIGINT", function () {
                process.emit("SIGINT");
            });
    }

    process.on("SIGINT", function () {
        console.log("Exiting Gracefuly");

        // Exit Webpack
        console.log("Stopping Webpack");
        watcher.close(function () {
            console.log("Webpack is no longer watching.");
            
            // Exit Nodemon
            nodemon.once('exit', function () {
                console.log("Exiting Nodemon...");
                process.exit();
            }).emit('quit');
        });
    });
}