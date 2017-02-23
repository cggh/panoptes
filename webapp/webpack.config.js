let path = require('path');
let webpack = require('webpack');
let HtmlWebpackPlugin = require('html-webpack-plugin');
let autoprefixer = require('autoprefixer');
let CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = function (env) {
  const nodeEnv = env && env.prod ? 'production' : 'development';
  const isProd = nodeEnv === 'production';

  const plugins = [
    new webpack.EnvironmentPlugin({
      NODE_ENV: nodeEnv,
    }),
    new webpack.NamedModulesPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      inject: 'body',
      hash: true
    }),
    new CopyWebpackPlugin([
      //Using this method for the favicons - this method should not be used generally, esp in JS where one can require(IMAGE_PATH)
      {from: 'src/images/favicons', to: 'images/favicons'},
    ])
  ];

  if (isProd) {
    plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          screw_ie8: true,
          conditionals: true,
          unused: true,
          comparisons: true,
          sequences: true,
          dead_code: true,
          evaluate: true,
          if_return: true,
          join_vars: true,
        },
        output: {
          comments: false,
        },
      }),
      new CopyWebpackPlugin([
        //Using this method for the favicons - this method should not be used generally, esp in JS where one can require(IMAGE_PATH)
        {from: 'src/images/favicons', to: 'images/favicons'},
      ])
    );
  } else {
    plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      })
    );
  }

  return {
    devtool: isProd ? 'source-map' : 'eval',
    context: __dirname,
    entry: {
      babel: isProd ? ['babel-polyfill'] : ["webpack-dev-server/client?http://localhost:8080", 'babel-polyfill'],
      panoptes: isProd ? [path.resolve(__dirname, 'src/js/index.js')] : ["webpack-dev-server/client?http://localhost:8080", path.resolve(__dirname, 'src/js/index.js')]
    },
    output: {
      path: path.resolve(__dirname, 'dist/panoptes'),
      filename: '[name].js',
      chunkFilename: '[chunkhash].js',
      publicPath: isProd ? '/panoptes/' : '/'
    },
    module: {
      rules: [
        // required for react jsx and es6
        {
          test: /\.js?$/,
          exclude: /(node_modules|bower_components)/,
          use: ['babel-loader']
        },
        // required to write 'require('./style.css')'
        {
          test: /\.css$/,
          use: [
            {loader: 'style-loader'},
            {loader: 'css-loader'},
            {loader: 'postcss-loader', options: {plugins: [autoprefixer({browsers: ['last 2 versions']})]}},
          ]
        },
        {
          test: /\.scss$/,
          use: [
            {loader: 'style-loader'},
            {loader: 'css-loader'},
            {loader: 'postcss-loader', options: {plugins: [autoprefixer({browsers: ['last 2 versions']})]}},
            {loader: 'sass-loader'},
          ]
        },
        {test: /\.(png|jpg|ico|xml)$/, loader: 'url-loader?limit=64000'},
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'url-loader?prefix=font/&limit=5000&mimetype=application/font-woff'
        },
        {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader?prefix=font/'},
        {test: /\.json$/, loader: 'file-loader'}
      ]
    },
    resolve: {
      modules: [
        'src/js',
        'src/js/components',
        'src/styles',
        'node_modules'
      ],
    },

    plugins,

    stats: {
      colors: {
        green: '\u001b[32m',
      }
    },

    devServer: {
      contentBase: 'dist',
      headers: {"Access-Control-Allow-Origin": "*"},
      historyApiFallback: true,
      compress: isProd,
      inline: !isProd,
      // hot: !isProd,
      stats: {
        assets: false,
        children: false,
        chunks: false,
        hash: false,
        // modules: false,
        // publicPath: false,
        timings: true,
        // version: false,
        // warnings: true,
        // colors: {
        //   green: '\u001b[32m',
        // }
      },
      proxy: {
        '/panoptes/api': {
          target: 'http://localhost:8000/',
          secure: false
        },
        '/panoptes/Docs': {
          target: 'http://localhost:8000/',
          secure: false
        },
        '/panoptes/Maps': {
          target: 'http://localhost:8000/',
          secure: false
        }
      }
    }


  };
};
