const generateDefaultConfig = require('./webpack.config.js');
const CompressionPlugin = require('compression-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = env => {
    const config = generateDefaultConfig(env);

    config.mode = 'production'; // This uses webpack's default "minify"
    config.devtool = 'none';
    config.output.filename = config.output.filename.replace('.js', '.min.js');

    config.plugins = [
        new CompressionPlugin({
            test: /\.(js|css)$/,
            filename: (info) => info.path.replace('.js', '.gz.js'),
            algorithm: 'gzip',
            deleteOriginalAssets: false
        }),
        new CleanWebpackPlugin(['dist'])
    ];

    return config;
};
