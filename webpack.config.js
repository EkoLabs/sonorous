const LIBRARY_NAME = 'Sonorous';
const path = require('path');
const express = require('express');

module.exports = () => {
    return {
        mode: 'development', // Overridden in webpack.prod.js
        entry: {
            [LIBRARY_NAME]: path.join(__dirname, 'src', `${LIBRARY_NAME}.js`)
        },
        devServer: {
            contentBase: './dist',
            host: '0.0.0.0',
            port: 9090,
            before(app) {
                app.use('/test/integration/public/',
                    express.static(path.join(__dirname, 'test', 'integration', 'public')));
            }
        },
        output: {
            path: path.join(__dirname, 'dist'),
            filename: '[name].js', // Overridden in webpack.prod.js
            library: LIBRARY_NAME,
            libraryExport: 'default',
            libraryTarget: 'umd'
        },

        module: {
            rules: [
                {
                    test: /(\.jsx|\.js)$/,
                    loader: 'babel-loader',
                    exclude: /(node_modules|bower_components)/
                },
                {
                    test: /(\.jsx|\.js)$/,
                    loader: 'eslint-loader',
                    exclude: /node_modules/
                }
            ]
        },

        resolve: {
            modules: [path.resolve('./node_modules'), path.resolve('./src')],
            extensions: ['.json', '.js']
        },

        // Static files
        context: path.join(__dirname, 'src')

    };
};

