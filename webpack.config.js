const path = require('path');

module.exports = {
    entry: "./src/client/index.js",
    output: {
        path: path.resolve(__dirname, "public"),
        filename: "bundle.js"
    },
    module: {
        rules: [
            {test: /\.(js|jsx)$/, use: 'babel-loader'},
            {test: /\.vue$/, use: 'vue-loader'}
        ]
    }
};