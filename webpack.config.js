import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import { sentryWebpackPlugin } from '@sentry/webpack-plugin';


export default {
  target: 'web',
  node: {
    __dirname: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  devtool: 'source-map',
  entry: {
    SEQTA: './src/SEQTA.ts',
    background: './src/background.ts',
    'css/documentload': './src/css/documentload.scss',
    'css/iframe': './src/css/iframe.scss',
    'css/injected': './src/css/injected.scss',
  },
  output: {
    filename: (pathData) => {
      const name = pathData.chunk.name.replace('css-', '');
      return name.includes('css') ? `css/${name}.js` : `${name}.js`;
    },
    // eslint-disable-next-line no-undef
    path: path.resolve('build'),
    publicPath: '',
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2
            }
          },
          'sass-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'src/[path][name][ext]',
        },
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new ESLintPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css' 
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'src/css/preview', to: 'css/preview' },
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js' },
        { from: 'interface/dist/client', to: 'client' },
        { from: 'interface/dist/index.html', to: 'interface/index.html' }
      ],
    }),
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "betterseqta-plus",
      project: "betterseqtaplus-main",
    }),
  ],
};
