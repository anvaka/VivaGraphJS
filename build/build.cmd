@echo off

REM Change path to installed uglify-js module here.
set NODE_PATH=..\packages\node_modules

REM invoke the build script.
node build.js

echo Done.