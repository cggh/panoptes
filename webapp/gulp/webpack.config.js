'use strict';

let path = require('path');
let webpack = require('webpack');
let HtmlWebpackPlugin = require('html-webpack-plugin');
let autoprefixer = require('autoprefixer');
let CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  cache: true,
  entry: {
    babel: ['babel-polyfill'],
    panoptes: [path.resolve(__dirname, '../src/js/index.js')]
  },
  output: {
    path: path.resolve(__dirname, '../dist/panoptes'),
    filename: '[name].js',
    chunkFilename: '[chunkhash].js',
    publicPath: '/panoptes/'
  },
  module: {
    noParse: [
      /plotly\.js/
    ],
    loaders: [
      // required for react jsx and es6
      {
        test: /\.js?$/,
        exclude: /(node_modules|bower_components)/,
        loaders: ['babel?presets[]=es2015&presets[]=stage-1&presets[]=react']
      },
      // required to write 'require('./style.css')'
      {test: /\.css$/, loader: 'style!css!postcss'},
      {test: /\.scss$/, loader: 'style!css!postcss!sass'},
      {test: /\.(png|jpg|ico|xml)$/, loader: 'url?limit=64000'},
      {test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url?prefix=font/&limit=5000&mimetype=application/font-woff'},
      {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?prefix=font/'},
      {test: /\.json$/, loader: 'file'}
    ]
  },
  postcss: [autoprefixer({browsers: ['last 2 versions']})],
  resolve: {
    modulesDirectories: [
      'src/js',
      'src/js/components',
      'src/styles',
      'node_modules'
    ],
    alias: {
    }
  },
  plugins: [
    new HtmlWebpackPlugin( {
      template: path.resolve(__dirname, '../src/index.html'),
      inject: 'body',
      hash: true
    }),
    new webpack.DefinePlugin({
      'process.env': {
        // This has effect on the react lib size
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin(),
    new CopyWebpackPlugin([
      //Using this method for the favicons - this method should not be used generally, esp in JS where one can require(IMAGE_PATH)
      {from: 'src/images/favicons', to: 'images/favicons'},
    ])
  ]
};
