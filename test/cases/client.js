const assert = require('assert');
const { delay } = require('../delay.js');
const { Client } = require('../../dist/client');
const path = require('path');
const test = require('node:test');
const {fork} = require('child_process');

const transmit_delay = 1000;
test('normal connect', async (t) => {
    const client = new Client({
        path: path.resolve(__dirname, './unixServer'),
        retry: 900
    });
    await new Promise((resolve, reject) => {
        const server = fork(path.resolve(__dirname, './server.js'));
        const timer = setTimeout(reject, 1000);
        server.on('message', data => {
            if (data === 'started') {
                clearTimeout(timer);
                resolve();
            }
        });
    });
    await client.connect();

    await t.test('client send and receive', async () => {

        let serverID = '';
        let serverMessage = '';

        const expectedServerID = 'unixServer';
        const expectedMessage = 'I am unix server!';


        client.on(
            'message',
            function gotMessage(data) {
                serverID = data.id
                serverMessage = data.message
            }
        );

        client.send(
            'message',
            {
                id: 'testClient',
                message: 'Hello from Client.'
            }
        );

        await delay(transmit_delay);

        assert.deepEqual(serverID, expectedServerID);
        assert.deepEqual(serverMessage, expectedMessage);
    })

    client.send(
        'END'
    );
    client.stop();
});
