//sudo apt-get install nodejs nodejs-legacy npm
//sudo npm install -g requirejs
//export NODE_PATH=/usr/local/lib/node_modules
//node scripts/dist.js

var requirejs = require('requirejs');

var config = {
    baseUrl: "webapp/scripts",
    paths: {
        jquery: "DQX/Externals/jquery",
        d3: "DQX/Externals/d3",
        handlebars: "DQX/Externals/handlebars",
        markdown: "DQX/Externals/markdown",
        DQX: "DQX",
        _:"DQX/Externals/lodash",
        tween: "Externals/Tween",
        datastream: "DQX/Externals/DataStream",
        blob: "DQX/Externals/Blob",
        filesaver: "DQX/Externals/FileSaver",
        lzstring: "DQX/Externals/lz-string"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        tween: {
          exports: 'TWEEN'
        },
        datastream: {
          exports: 'DataStream'
        },
        blob: {
          exports: 'Blob'
        },
        filesaver: {
          exports: 'saveAs'
        },
        lzstring: {
          exports: 'LZString'
        }

    },
    waitSeconds: 15,
    name: 'main',
    out: 'webapp/scripts/main-built.js'
};

requirejs.optimize(config, function (buildResponse) {
    //buildResponse is just a text output of the modules
    //included. Load the built file for the contents.
    //Use config.out to get the optimized file contents.
    var contents = fs.readFileSync(config.out, 'utf8');
    console.log(contents);
}, function(err) {
    console.log(err);
    //optimization err callback
});
