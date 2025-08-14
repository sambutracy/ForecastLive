const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      publicPath: '/',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        components: path.resolve(__dirname, 'src/components/'),
        contexts: path.resolve(__dirname, 'src/contexts/'),
        config: path.resolve(__dirname, 'src/config/'),
      },
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
          NODE_ENV: process.env.NODE_ENV || 'development',
        }),
      }),
    ],
    devServer: {
      historyApiFallback: true,
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 3000,
      hot: true,
      open: true,
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
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    mode: isProduction ? 'production' : 'development',
  };
};
