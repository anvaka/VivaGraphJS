// Generated on 2013-03-27 using generator-webapp 0.1.5
"use strict";

module.exports = function (grunt) {
    var libConfig = {
        src: "src",
        dist: "dist"
    };
    // This needs to be changed. It"s just copies structure of
    // my original builder, which was not really well organized:
    var fileGroups = {
        core: [
            "vivagraph.js",
            "version.js",
            "Utils/etc.js",
            "Utils/browserInfo.js",
            "Utils/indexOf.js",
            "Utils/getDimensions.js",
            "Utils/events.js",
            "Input/dragndrop.js",
            "Input/domInputManager.js",
            "Input/spatialIndex.js", // TODO: Do I need this for SVG?
            "Utils/timer.js",
            "Utils/geom.js",

            "Core/primitives.js",
            "Core/graph.js",
            "Core/operations.js",

            "Physics/primitives.js",
            "Physics/eulerIntegrator.js",
            "Physics/Forces/nbodyForce.js",
            "Physics/Forces/dragForce.js",
            "Physics/Forces/springForce.js",
            "Physics/forceSimulator.js",
            "Layout/forceDirected.js",
            "Layout/constant.js",
            "View/renderer.js"
        ],
        extra: [
            "Core/serializer.js",
            "Algorithms/centrality.js",
            "Algorithms/Community/community.js",
            "Algorithms/Community/slpa.js",
            "Core/generator.js",
            "View/cssGraphics.js"
        ],
        svg: [
            "Svg/svg.js",
            "View/svgGraphics.js",
            "View/svgNodeFactory.js",
        ],
        webgl: [
            "WebGL/webgl.js",
            "WebGL/webglUIModels.js",
            "WebGL/webglNodeProgram.js",
            "WebGL/webglLinkProgram.js",
            "WebGL/webglImageNodeProgram.js",
            "View/webglGraphics.js",
            "WebGL/webglInputEvents.js",
            "Input/webglInputManager.js",
        ]
    };
    Object.keys(fileGroups).forEach(function (key) {
        fileGroups[key] = fileGroups[key].map(function (path) {
            return libConfig.src + "/" + path;
        });
    });
    grunt.initConfig({
        lib: libConfig,
        watch: {
            js: {
                files: "<%= lib.src %>/**/*.js",
                tasks: ["build"],
                spawn: true
            }
        },
        jshint: {
            all: [
                "Gruntfile.js",
                "<%= lib.src %>/{,*/}*.js"
            ],
            options: {
                jshintrc: ".jshintrc"
            }
        },
        clean: {
            dist: ["<%= lib.dist %>/*"],
        },
        concat: {
            options: {
                separator: ""
            },
            all: {
                src: [
                    fileGroups.core,
                    fileGroups.extra,
                    fileGroups.svg,
                    fileGroups.webgl
                ],
                dest: "<%= lib.dist %>/vivagraph.js"
            },
            svg: {
                src: [
                    fileGroups.core,
                    fileGroups.svg
                ],
                dest: "<%= lib.dist %>/vivagraph.svg.js"
            },
            webgl: {
                src: [
                    fileGroups.core,
                    fileGroups.webgl
                ],
                dest: "<%= lib.dist %>/vivagraph.webgl.js"
            },
        },
        uglify: {
            dist: {
                files: {
                    "<%= lib.dist %>/vivagraph.min.js": ["<%= lib.dist %>/vivagraph.js"]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-regarde");

    grunt.renameTask("regarde", "watch");

    grunt.registerTask("build", [
        "clean:dist",
        "concat:all",
        "uglify"
    ]);
    grunt.registerTask("server", [
        "build",
        "watch"
    ]);
    grunt.registerTask("default", ["jshint", "build"]);
};
