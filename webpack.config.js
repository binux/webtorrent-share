module.exports = {
  target: 'web',
  node: {
    fs: 'empty'
  },
  entry: "./index.js",
  output: {
    path: __dirname,
    filename: "bundle.js"
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: "style!css" },
      { test: /\.json$/, loader: 'json' }
    ]
  }
};

