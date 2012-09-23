/**
 * Configuration to include all features of vivagraph in one file.
 */
configuration = {
    outName : '../dist/vivagraph',
    workDir : '../src/',
    files : [
            "vivagraph.js",
            "version.js",
            "Utils/etc.js",
            "Utils/browserInfo.js",
            "Utils/indexOf.js",
            "Utils/getDimensions.js",
            "Utils/events.js",
            "Input/dragndrop.js",
            "Input/domInputManager.js",
            "Input/spatialIndex.js",
            "Utils/timer.js",
            "Utils/geom.js",

            "Core/primitives.js",
            "Core/graph.js",
            "Core/generator.js",
            "Core/operations.js",
            "Algorithms/centrality.js",

            "Algorithms/Community/slpa.js",
            "Algorithms/Community/community.js",

            "Physics/primitives.js",
            //"Physics/rungeKuttaIntegrator.js",
            "Physics/eulerIntegrator.js",
            "Physics/Forces/nbodyForce.js",
            "Physics/Forces/dragForce.js",
            "Physics/Forces/springForce.js",
            "Physics/forceSimulator.js",
            "Layout/forceDirected.js",
            "Layout/constant.js",

            "View/cssGraphics.js",
            "Svg/svg.js",
            "View/svgGraphics.js",
            "View/svgNodeFactory.js",

            "WebGL/webgl.js",
            "WebGL/webglUIModels.js",
            "WebGL/webglNodeProgram.js",
            "WebGL/webglLinkProgram.js",
            "WebGL/webglImageNodeProgram.js",
            "View/webglGraphics.js",

            "WebGL/webglInputEvents.js",
            "Input/webglInputManager.js",

            "View/renderer.js",
            "Core/serializer.js"
    ]
};
