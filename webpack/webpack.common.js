const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    devtool: "source-map",
    entry: {
        options: path.join(__dirname, '../src/options.ts'),
        background: path.join(__dirname, '../src/background.ts')
    },
    output: {
        path: path.join(__dirname, '../dist'),
        filename: '[name].js'
    },

    resolve: {
        extensions: [".ts", ".js"]
    },

    plugins: [
        new CopyWebpackPlugin([
            { from: 'src/static', to: './' }
        ])
    ],

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                }]
            },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            }
        ]
    }
};