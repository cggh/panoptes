var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require('html-webpack-plugin');
var autoprefixer = require('autoprefixer');

module.exports = {
  cache: true,
  entry: {
    babel:['babel-polyfill'],
    panoptes: [path.resolve(__dirname, "../src/js/index.js")]
  },
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "[name].js",
    chunkFilename: "[chunkhash].js"
  },
  devServer: {
    contentBase: path.resolve(__dirname, "../dist"),
    headers: { "Access-Control-Allow-Origin": "*" }
  },
  module: {
    loaders: [
      // required for react jsx and es6
      {
        test: /\.js?$/,
        exclude: /(node_modules|bower_components)/,
        loaders: ['babel?presets[]=es2015&presets[]=stage-1&presets[]=react']
      },
      // required to write "require('./style.css')"
      { test: /\.css$/,    loader: "style!css!postcss" },
      { test: /\.scss$/,    loader: "style!css!postcss!sass" },
      { test: /\.(png|jpg)$/, loader: 'url?limit=64000'},
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,   loader: "url?prefix=font/&limit=5000&mimetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,    loader: "file?prefix=font/" },
      { test: /\.json$/,    loader: "file" }
    ]
  },
  postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
  resolve: {
    modulesDirectories: [
      'src/js',
      'src/js/components',
      'node_modules',
      'src/styles'
    ],
    alias: {
    }
  },
  plugins: [
    new HtmlWebpackPlugin( {
      template: path.resolve(__dirname, "../src/index.html"),
      inject: 'body',
      hash: true
    }),
    new webpack.DefinePlugin({
      "process.env": {
        // This has effect on the react lib size
        "NODE_ENV": JSON.stringify("production")
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ]
};
