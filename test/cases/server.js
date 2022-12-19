const path = require('path');
const { Server } = require('../../dist/server');

const dieAfter = 30e3;

function killServerProcess() {
    // console.log('killllll');
    server.stop();
    process.exit(0);
}

setTimeout(
    killServerProcess,
    dieAfter
).unref();

const server = new Server({
    path: path.resolve(__dirname, './unixServer')
});
(async () => {
    // console.log('starting', server.config.path);
    await server.start();
    server.on(
        'message',
        function gotMessage(data, socket) {
            // console.log('send message back');
            server.send(
                socket,
                'message',
                {
                    id: 'unixServer',
                    message: 'I am unix server!'
                }
            );
        }
    );
    server.on(
        'END',
        killServerProcess
    );
    process.send('started');
})();
