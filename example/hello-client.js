const {Client} = require('../dist/client');

const client = new Client({
    id: 'hello'
});

process.on('exit', () => {
    client.stop();
});

(async () => {
    await client.connect();
    client.on('app.message', data => {
        console.log('client received: ', data);
    })
    setInterval(() => {
        client.send('app.message', {
            message: 'hello'
        });
    }, 1000);
})();
