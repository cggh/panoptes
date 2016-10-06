var gulp = require('gulp');
var gutil = require("gulp-util");
var webpack = require("webpack");
var path = require("path");
var WebpackDevServer = require("webpack-dev-server");
var config = require("../config.js");
var webpackConfig = require("../webpack.config.js");
var HtmlWebpackPlugin = require('html-webpack-plugin');

var devConfig = {
    contentBase: path.resolve(__dirname, "../dist"),
    headers: { "Access-Control-Allow-Origin": "*" },
    historyApiFallback: true,
    stats: {
      colors: true,
      chunkModules: false, //Reduce logging a bit!
      assets: false,
    },
    proxy: {
      '/panoptes/api': {
        target: 'http://localhost:8000/',
        secure: false
      },
      '/panoptes/Docs': {
        target: 'http://localhost:8000/',
        secure: false
      }
    }
  };

gulp.task("webpack-dev-server", function(callback) {
  // modify some webpack config options
  var myConfig = Object.create(webpackConfig);
  myConfig.output.publicPath = '/';
  myConfig.devtool = "eval";
  myConfig.debug = true;
  myConfig.plugins = [
    new HtmlWebpackPlugin( {
      template: path.resolve(__dirname, "../../src/index.html"),
      inject: 'body',
      hash: true
    }),
  ];
  //Make the webpack dev server inline instead of iframe
  myConfig.entry.babel.unshift("webpack-dev-server/client?http://"+config.server.settings.host+":"+config.server.settings.port);
  myConfig.entry.panoptes.unshift("webpack-dev-server/client?http://"+config.server.settings.host+":"+config.server.settings.port);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), devConfig).listen(config.server.settings.port, config.server.settings.host, function(err) {
      if(err) throw new gutil.PluginError("webpack-dev-server", err);
      gutil.log("[webpack-dev-server]", "http://"+config.server.settings.host+":"+config.server.settings.port+"/webpack-dev-server/index.html");
    });
});

gulp.task("webpack-devhot-server", function(callback) {
  // modify some webpack config options
  var myConfig = Object.create(webpackConfig);
  myConfig.devtool = "source-map";
  myConfig.debug = true;
  myConfig.entry.panoptes = myConfig.entry.panoptes.concat(['webpack/hot/dev-server']);
  myConfig.module.loaders[0].loaders = ['react-hot', myConfig.module.loaders[0].loaders[0]];
  myConfig.plugins = [
    new HtmlWebpackPlugin( {
      template: path.resolve(__dirname, "../../src/index.html"),
      inject: 'body',
      hash: true
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ];
  //Make the webpack dev server inline instead of iframe
  myConfig.entry.babel.unshift("webpack-dev-server/client?http://"+config.server.settings.host+":"+config.server.settings.port);
  myConfig.entry.panoptes.unshift("webpack-dev-server/client?http://"+config.server.settings.host+":"+config.server.settings.port);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), Object.assign({hot: true}, devConfig)).listen(config.server.settings.port, config.server.settings.host, function(err) {
    if(err) throw new gutil.PluginError("webpack-dev-server", err);
    gutil.log("[webpack-devhot-server]", "http://"+config.server.settings.host+":"+config.server.settings.port+"/webpack-dev-server/index.html");
  });
});

gulp.task("webpack-prodtest-server", function(callback) {
  // modify some webpack config options
  var myConfig = Object.create(webpackConfig);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), devConfig).listen(config.server.settings.port, config.server.settings.host, function(err) {
      if(err) throw new gutil.PluginError("webpack-dev-server", err);
      gutil.log("[webpack-dev-server]", "http://"+config.server.settings.host+":"+config.server.settings.port+"/webpack-dev-server/index.html");
    });
});
