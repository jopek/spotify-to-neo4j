const path = require('path');

const appPath = (...names) => path.join(process.cwd(), ...names);

//This will be merged with the config from the flavor
module.exports = {
    entry: {
        main: [appPath('src', 'main.js'), appPath('src', 'css', 'styles.scss')]
    },
    output: {
        filename: 'bundle.[hash].js',
        path: appPath('build'),
        publicPath: '/'
    },
    devServer: {
        contentBase: path.join(__dirname, './'),
        compress: true,
        hot: true,
        watchContentBase: true,
        port: 3000,
        proxy: {
            '/api': 'http://127.0.0.1:8081/'
        }
    }
};
