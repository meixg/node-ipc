import EventEmitter from 'events';
import net from 'net';
import { getClientDefaultConfig } from './entities/defaults';
import { createMessage, parseMessage } from './entities/message';

export interface ClientConfig {
    logger: {
        log: (...args: any) => void
    };
    id: string;
    path: string;
    retry: number;
    maxRetries: number;
    endMark: string;
}

export class Client extends EventEmitter {
    log: ClientConfig["logger"]["log"]
    config: ClientConfig
    retriesRemaining = 0;
    socket?: net.Socket;
    explicitlyDisconnected = false;
    ipcBuffer = ''

    constructor(config: Partial<ClientConfig>) {
        super()

        this.config = {
            ...getClientDefaultConfig(),
            ...config
        };
        this.log = this.config.logger.log;

        (config.maxRetries) ? this.retriesRemaining = config.maxRetries : 0;
    }


    send(type: string, data: any) {
        // this.log('dispatching event to ', this.config.id, this.config.path, ' : ', type, ',', data);

        const message = createMessage(type, data);
        this.socket && this.socket.write(message + this.config.endMark);
        return;
    }

    stop() {
        this.socket && this.socket.destroy();
    }

    connect(): Promise<Client> {
        //init client object for scope persistance especially inside of socket events.
        // client.log('requested connection to ', client.id, client.path);

        if (!this.config.path) {
            this.log('\n\n######\nerror: ', this.config.id, ' client has not specified socket path it wishes to connect to.');
            return Promise.reject();
        }

        const options = {
            path: this.config.path
        };

        // this.log('Connecting client on Unix Socket :', this.config.path);
        return new Promise((resolve, reject) => {
            this.socket = net.connect(options);
            this.socket.setEncoding('utf-8');

            this.socket.on(
                'error',
                err => {
                    this.log('\n\n######\nerror: ', err);
                    reject(err);
                }
            );

            this.socket.on(
                'close',
                () => {
                    this.log(
                        'connection closed',
                        this.config.id,
                        this.config.path,
                        this.retriesRemaining,
                        'tries remaining of',
                        this.config.maxRetries
                    );

                    if (this.socket && this.socket.destroyed) {
                        return;
                    }

                    // 达到最大重试次数
                    if (this.retriesRemaining < 1 || this.explicitlyDisconnected) {
                        this.emit('disconnect');
                        this.log(this.config.id, 'exceeded connection retry amount');

                        this.socket && this.socket.destroy();
                        this.emit('destroy');
                        reject('exceeded connection retry amount');
                        return;
                    }

                    setTimeout(
                        () => {
                            if (this.explicitlyDisconnected) {
                                return;
                            }

                            this.retriesRemaining--;
                            this.connect();
                        },
                        this.config.retry
                    );

                    this.emit('disconnect');
                }
            );

            this.socket.on(
                'data',
                (data: string) => {
                    // this.log('## received events ##');

                    if (!this.ipcBuffer) {
                        this.ipcBuffer = '';
                    }

                    data = (this.ipcBuffer += data);

                    // 未传输完毕
                    if (!data.includes(this.config.endMark)) {
                        return;
                    }

                    const events = data.split(this.config.endMark);
                    this.ipcBuffer = events.pop() || '';

                    for (const event of events) {
                        try {
                            const message = parseMessage(event)
                            // this.log('detected event', message.type, message.data);
                            this.emit(
                                message.type,
                                message.data
                            );
                        }
                        catch (e) {
                            this.log('Invalid JSON message format', e);
                        }
                    }
                }
            );

            this.socket.on(
                'connect',
                () => {
                    this.retriesRemaining = this.config.maxRetries;
                    resolve(this);
                }
            );
        });

    }
}
