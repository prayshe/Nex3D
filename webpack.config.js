const path = require('path');

module.exports = {
  mode: "development",
  entry: {
    main: "./app/index.ts",
  },
  output: {
    path: path.resolve(__dirname, './build'),
    filename: "index.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
};