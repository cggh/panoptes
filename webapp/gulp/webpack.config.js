var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  cache: true,
  entry: {
    panoptes: [path.resolve(__dirname, "../src/js/index.js"), 'webpack/hot/dev-server']
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
      // required to write "require('./style.css')"
      { test: /\.css$/,    loader: "style!css!autoprefixer" },
      { test: /\.scss$/,    loader: "style!css!autoprefixer!sass" },
      { test: /\.(png|jpg)$/, loader: 'url?limit=64000'},
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,   loader: "url?prefix=font/&limit=5000&mimetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,    loader: "file?prefix=font/" },

      // required for react jsx and es6
      {
        test: /\.js?$/,
        exclude: /(node_modules|bower_components)/,
        loaders: ['react-hot', 'babel?optional[]=runtime&stage=1']
      }
    ]
  },
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
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ]
};
