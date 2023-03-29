const express = require('express');
const proxy = require('express-http-proxy');
const chokidar = require('chokidar');
const archiver = require('archiver');
const stream = require('stream');
const request = require('request');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.config');


const PROXY_PORT = 5002;
const WEBPACK_PORT = 5003;
const DEFAULT_DEV_SERVER = 'dev.jobdone.net';

if (!process.env['JOBDONE_DEV_KEY']) {
    console.error('Set JOBDONE_DEV_KEY environment variable with your developer API key');
    process.exit(1);
}


const app = express();

app.set('host', 'localhost');
app.set('port', PROXY_PORT);

app.use('/static/assets', proxy(`localhost:${WEBPACK_PORT}/webpack-dev-server`));

app.use('/', proxy(process.env.JOBDONE_DEV_SERVER || DEFAULT_DEV_SERVER, {
    preserveHostHdr: true,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers['X-Dev-API-Key'] = process.env.JOBDONE_DEV_KEY;
        return proxyReqOpts;
    }
}));


let server = app.listen(app.get('port'), app.get('host'), () => {
    console.log(`Dev server has been started at ${app.get('host')}:${app.get('port')}`);

    uploadTemplates(err => {
        if (err) {
            console.log('Development server is probably down or answering with error. Exiting');
            process.exit(1);
        }

        console.log('Watching templates directory for changes...');
        chokidar.watch('templates/**/*.html', {ignored: /(^|[\/\\])\../}).on('change', path => {
            console.log('Detected change in templates. Sending update to the server...');
            uploadTemplates();
        });

        console.log('Starting webpack...');

        let webpackServer = new WebpackDevServer(webpack(webpackConfig), {
            stats: {
                colors: true
            }
        });

        webpackServer.listen(WEBPACK_PORT, app.get('host'), err => {
            if (err) {
                console.error(err);
                return;
            }

            console.log('Webpack server has been started');
        });
    });
});


function uploadTemplates(cb) {
    let bufferStream = new stream.Writable(),
        buffers = [],
        archive = archiver('zip');

    bufferStream._write = function(chunk, _, next) {
        buffers.push(chunk);
        next();
    };
    bufferStream.on('finish', () => {
        let buffer = Buffer.concat(buffers);

        let options = {
            url: `http://localhost:${PROXY_PORT}/api/developer/templates`,
            formData: {
                file: {
                    value: buffer,
                    options: {
                        filename: 'file.zip',
                        contentType: 'application/zip'
                    }
                }
            }
        };

        request.post(options, (err, response) => {
            if (err || response.statusCode !== 200) {
                let error = err || new Error('Status code ' + response.statusCode);
                console.log('Unable to send templates:', error.message);
                return cb(error);
            }

            console.log('Templates have been updated');
            cb && cb(null);
        });
    });

    archive.pipe(bufferStream);
    archive.directory('templates/', '/');
    archive.finalize();

    // TODO: do not allow to send huge files and check that each entry is HTML + the same on the server-side
    // TODO: send only partial updates
}


module.exports.app = app;
