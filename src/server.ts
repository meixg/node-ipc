import net from "net";
import fs from "fs";
import EventEmitter from "events";
import { createMessage, parseMessage } from "./entities/message";
import { getServerDefaultConfig } from "./entities/defaults";

export interface ServerConfig {
    path: string;
    logger: {
        log: (...args: any) => void;
    };
    maxConnections: number;
    endMark: string;
}

export class Server extends EventEmitter {
    log: ServerConfig["logger"]["log"];
    config: ServerConfig;
    server?: net.Server;

    constructor(config: Partial<ServerConfig>) {
        super();
        this.config = {
            ...getServerDefaultConfig(),
            ...config
        };
        this.log = this.config.logger.log;
    }
    sockets: net.Socket[] = [];

    stop() {
        this.server && this.server.close();
    }

    start(): Promise<Server> {
        if (!this.config.path) {
            throw Error("Socket Server Path not specified, refusing to start");
        }

        return new Promise((resolve, reject) => {
            this.server = net.createServer(this.onConnection.bind(this));

            this.server.on("error", (err: Error) => {
                this.log("server error", err);

                reject();
                this.emit("error", err);
            });

            this.server.maxConnections = this.config.maxConnections;

            this.server.listen(
                {
                    path: this.config.path,
                },
                () => {
                    resolve(this);
                    this.emit("start");
                }
            );
        });
    }

    onConnection(socket: net.Socket) {
        this.sockets.push(socket);

        if (socket.setEncoding) {
            socket.setEncoding("utf-8");
        }

        socket.on("close", () => {
            this.emit("close", socket);
            this.onClientClose(socket);
        });

        socket.on("error", (err: Error) => {
            this.log("server socket error", err);

            this.emit("error", err);
        });

        socket.on("data", this.gotData.bind(this, socket));

        this.emit("connect", socket);
    }

    gotData(socket: net.Socket & {ipcBuffer?: string}, data: string) {
        if (!socket.ipcBuffer) {
            socket.ipcBuffer = "";
        }

        data = (socket.ipcBuffer += data);

        // 未传输完毕
        if (!data.includes(this.config.endMark)) {
            return;
        }

        socket.ipcBuffer = "";

        const events = data.split(this.config.endMark);
        socket.ipcBuffer = events.pop() || '';

        for (const event of events) {
            try {
                const message = parseMessage(event);
                this.emit(message.type, message.data);
            }
            catch (e) {
                this.log('Invalid JSON message format', e);
            }
        }
    }

    onClientClose(socket: net.Socket) {
        const index = this.sockets.indexOf(socket);
        if (index === -1) {
            return;
        }

        socket.destroy();
        this.sockets.splice(index, 1);
        this.emit('socket.disconnected', socket);
    }


    send(socket: net.Socket, type: string, data: unknown) {
        // this.log("dispatching event to socket", " : ", type, data);
        const message = createMessage(type, data);
        socket.write(message + this.config.endMark);
    }

    broadcast(type: string, data: unknown) {
        // this.log(
        //     "broadcasting event to all known sockets listening to ",
        //     this.config.path,
        //     " : ",
        //     type,
        //     data
        // );
        const message = createMessage(type, data) + this.config.endMark;
        for (const socket of this.sockets) {
            socket.write(message);
        }
    }
}
