const {Server} = require('../dist/server');

const server = new Server({});

process.on('exit', () => {
    server.stop();
});

//catches ctrl+c event
process.on('SIGINT', () => {
    process.exit();
});

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', () => {
    process.exit();
});
process.on('SIGUSR2', () => {
    process.exit();
});

//catches uncaught exceptions
process.on('uncaughtException', () => {
    process.exit();
});

(async () => {
    await server.start();
    server.on('app.message', (data, socket) => {
        console.log('server received: ', data);

        server.send(socket, 'app.message', {
            message: data.message + ' world!'
        });
    });
})();
