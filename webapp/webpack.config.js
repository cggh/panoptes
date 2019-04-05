let path = require('path');
let webpack = require('webpack');
let HtmlWebpackPlugin = require('html-webpack-plugin');
let autoprefixer = require('autoprefixer');
let CopyWebpackPlugin = require('copy-webpack-plugin');
let BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
let UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = function(env) {
  const nodeEnv = env && env.prod ? 'production' : 'development';
  const isProd = nodeEnv === 'production';
  const datasetUrlPathPrefix = env && env.DATASET_URL_PATH_PREFIX ? env.DATASET_URL_PATH_PREFIX : '';

  const plugins = [
    new webpack.EnvironmentPlugin({
      NODE_ENV: nodeEnv,
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      inject: 'body',
      hash: true
    }),
    new CopyWebpackPlugin([
      //Using this method for the favicons - this method should not be used generally, esp in JS where one can require(IMAGE_PATH)
      {from: 'src/images/favicons', to: 'images/favicons'},
    ]),
    new webpack.DefinePlugin({
      // Include leading and trailing forward slashes when not empty.
      'process.env.DATASET_URL_PATH_PREFIX': JSON.stringify(datasetUrlPathPrefix),
    }),
  ];

  if (isProd) {
    plugins.push(
      // new webpack.ContextReplacementPlugin(/(ansi-color|handlebars-helpers|create-frame)/, /^$/),
    );
  } else {
    plugins.push(
      new BundleAnalyzerPlugin({
        // Can be `server`, `static` or `disabled`.
        // In `server` mode analyzer will start HTTP server to show bundle report.
        // In `static` mode single HTML file with bundle report will be generated.
        // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
        analyzerMode: 'server',
        // Host that will be used in `server` mode to start HTTP server.
        analyzerHost: '127.0.0.1',
        // Port that will be used in `server` mode to start HTTP server.
        analyzerPort: 8888,
        // Path to bundle report file that will be generated in `static` mode.
        // Relative to bundles output directory.
        reportFilename: 'report.html',
        // Module sizes to show in report by default.
        // Should be one of `stat`, `parsed` or `gzip`.
        // See "Definitions" section for more information.
        defaultSizes: 'parsed',
        // Automatically open report in default browser
        openAnalyzer: false,
        // If `true`, Webpack Stats JSON file will be generated in bundles output directory
        generateStatsFile: false,
        // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
        // Relative to bundles output directory.
        statsFilename: 'stats.json',
        // Options for `stats.toJson()` method.
        // For example you can exclude sources of your modules from stats file with `source: false` option.
        // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
        statsOptions: null,
        // Log level. Can be 'info', 'warn', 'error' or 'silent'.
        logLevel: 'info'
      })
    );
  }

  return {
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          uglifyOptions: {
            warnings: false,
            conditionals: true,
            unused: true,
            comparisons: true,
            sequences: true,
            dead_code: true,
            evaluate: true,
            if_return: true,
            join_vars: true,
          },
        }),
      ]
    },
    mode: isProd ? 'production' : 'development',
    // devtool: isProd ? 'source-map' : 'eval',
    context: __dirname,
    entry: {
      babel: isProd ? ['@babel/polyfill'] : ["webpack-dev-server/client?http://localhost:8000", '@babel/polyfill'],
      panoptes: isProd ? [path.resolve(__dirname, 'src/js/index.js')] : ["webpack-dev-server/client?http://localhost:8000", path.resolve(__dirname, 'src/js/index.js')]
    },
    output: {
      path: path.resolve(__dirname, 'dist/panoptes'),
      filename: '[name].js',
      chunkFilename: '[chunkhash].js',
      publicPath: isProd ? '/panoptes/' : '/'
    },
    node: {
      fs: 'empty' //Needed for handlebars-helper
    },
    module: {
      rules: [

        {
          test: /(handlebars-helper|is-descriptor|create-frame)/,
          use: [
            {loader: 'unlazy-loader'},
          ]
        },
        // required for react jsx and es6
        {
          test: /\.js?$/,
          exclude: /(node_modules|bower_components)/,
          use: [
            {loader: 'babel-loader'}
          ]
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
        // {test: /\.json$/, loader: 'file-loader'},
        //Filter out this module as it is large and we don't need it (used by "date" handlebars helper)
        {
          test: path.resolve(__dirname, 'node_modules/moment'),
          use: 'null-loader'
        },
        {
          test: path.resolve(__dirname, 'node_modules/chalk'),
          use: 'null-loader'
        }
      ]
    },
    resolve: {
      symlinks: false,
      alias: {
        'handlebars': 'handlebars/dist/handlebars.js'
      },
      modules: [
        'src/js',
        'src/js/components',
        'src/styles',
        path.resolve(__dirname, 'node_modules')
      ],
    },

    plugins,

    stats: {
      colors: {
        green: '\u001b[32m',
      }
    },

    devServer: {
      public: 'panoptes-testing:8000',
      port: 8000,
      contentBase: 'dist',
      headers: {'Access-Control-Allow-Origin': '*'},
      historyApiFallback: {
        index: '/index.html',
        rewrites: [
          {from: /.html$/, to: '/index.html'}
        ]
      },
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
          target: 'http://localhost:7000/',
          secure: false
        },
        '/panoptes/Docs': {
          target: 'http://localhost:7000/',
          secure: false
        },
        '/panoptes/Maps': {
          target: 'http://localhost:7000/',
          secure: false
        }
      }
    }


  };
};
