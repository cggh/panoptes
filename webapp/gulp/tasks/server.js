var gulp = require('gulp');
var gutil = require("gulp-util");
var webpack = require("webpack");
var path = require("path");
var WebpackDevServer = require("webpack-dev-server");
var webpackConfig = require("../webpack.config.js");
var HtmlWebpackPlugin = require('html-webpack-plugin');
var port = 8080 ;
var host = '0.0.0.0' ;

gulp.task("webpack-dev-server", function(callback) {
  // modify some webpack config options
  var myConfig = Object.create(webpackConfig);
  myConfig.devtool = "source-map";
  myConfig.debug = true;
  myConfig.plugins = [
    new HtmlWebpackPlugin( {
      template: path.resolve(__dirname, "../../src/index.html"),
      inject: 'body',
      hash: true
    }),
  ];
  //Make the webpack dev server inline instead of iframe
  myConfig.entry.babel.unshift("webpack-dev-server/client?http://"+host+":"+port);
  myConfig.entry.panoptes.unshift("webpack-dev-server/client?http://"+host+":"+port);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), {
    historyApiFallback: true,
    stats: {
      colors: true,
      chunkModules: false, //Reduce logging a bit!
      assets: false
    }
  }).listen(port, host, function(err) {
      if(err) throw new gutil.PluginError("webpack-dev-server", err);
      gutil.log("[webpack-dev-server]", "http://"+host+":"+port+"/webpack-dev-server/index.html");
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
  myConfig.entry.babel.unshift("webpack-dev-server/client?http://"+host+":"+port);
  myConfig.entry.panoptes.unshift("webpack-dev-server/client?http://"+host+":"+port);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), {
    hot: true,
    historyApiFallback: true,
    stats: {
      colors: true,
      chunkModules: false, //Reduce logging a bit!
      assets: false
    }
  }).listen(port, host, function(err) {
    if(err) throw new gutil.PluginError("webpack-dev-server", err);
    gutil.log("[webpack-devhot-server]", "http://"+host+":"+port+"/webpack-dev-server/index.html");
  });
});

gulp.task("webpack-prodtest-server", function(callback) {
  // modify some webpack config options
  var myConfig = Object.create(webpackConfig);

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(myConfig), {
    historyApiFallback: true,
    stats: {
      colors: true
    }
  }).listen(port, "0.0.0.0", function(err) {
      if(err) throw new gutil.PluginError("webpack-dev-server", err);
      gutil.log("[webpack-dev-server]", "http://"+host+":"+port+"/webpack-dev-server/index.html");
    });
});
