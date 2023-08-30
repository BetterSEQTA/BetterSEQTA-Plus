const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");

module.exports = {
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  devtool: "cheap-module-source-map",
  entry: {
    SEQTA: "./src/SEQTA.js",
    background: "./src/background.js",
    "inject-documentload": "./src/inject/documentload.css", // Entry for CSS
    "inject-iframe": "./src/inject/iframe.css", // Entry for CSS
    "inject-injected": "./src/inject/injected.css", // Entry for CSS
  },
  output: {
    filename: (pathData) => {
      const name = pathData.chunk.name.replace("inject-", "");
      return name.includes("inject") ? `inject/${name}.js` : `${name}.js`;
    },
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, "build"),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
        // eslint-disable-next-line no-undef
        include: path.resolve(__dirname, "src"),
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "src/[path][name][ext]",
        },
      },
    ],
  },
  plugins: [
    new ESLintPlugin(),
    new MiniCssExtractPlugin({
      filename: (pathData) => {
        const name = pathData.chunk.name.replace("inject-", "");
        return name.includes("inject")
          ? `inject/${name}.css`
          : `inject/${name}.css`;
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public", to: "." },
        { from: "src/inject/preview", to: "inject/preview" },
      ],
    }),
  ],
};
