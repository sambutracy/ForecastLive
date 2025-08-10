const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new webpack.DefinePlugin({
      // Replace process.env references with actual values at build time
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.FORECAST_LIVE_BACKEND_CANISTER_ID': JSON.stringify(
        process.env.FORECAST_LIVE_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai'
      ),
      'process.env.DFX_NETWORK': JSON.stringify(
        process.env.DFX_NETWORK || 'local'
      ),
      // Explicitly define process.env to avoid "process is not defined" errors
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV || 'development'
      }),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: true,
      },
      progress: true,
      logging: 'info',
    },
    devMiddleware: {
      stats: 'errors-warnings',
    },
    open: true,
  },
  mode: 'development',
};
