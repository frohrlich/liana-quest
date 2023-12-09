const path = require("path");

module.exports = [
  {
    entry: "./src/client/app.ts",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    output: {
      filename: "app.js",
      path: path.resolve(__dirname, "dist"),
    },
    mode: "development",
  },
  {
    target: "node",
    externals: {
      express: "require('express')",
    },
    entry: "./src/server/server.ts",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    output: {
      filename: "server.js",
      path: path.resolve(__dirname, "dist"),
    },
    mode: "development",
  },
];
