
import net from 'net';
import fs from 'fs';
import EventParser from '../entities/EventParser.js';
import Message from 'js-message';
import Events from 'event-pubsub';

let eventParser = new EventParser();

class Server extends Events{
    constructor(path,config,log){
        super();
        this.config = config;
        this.path = path;
        this.log  = log;

        this.publish=super.emit;

        eventParser=new EventParser(this.config);

        this.on(
            'close',
            serverClosed.bind(this)
        );
    }

    server=false;
    sockets=[];
    emit=emit;
    broadcast=broadcast;

    onStart(socket){
        this.publish(
            'start',
            socket
        );
    }

    stop(){
        this.server.close();
    }

    start(){
        if(!this.path){
            this.log('Socket Server Path not specified, refusing to start');
            return;
        }

        if(this.config.unlink){
            fs.unlink(
                this.path,
                startServer.bind(this)
            );
        }else{
            startServer.bind(this)();
        }
    }
}

function emit(socket, type, data){
    this.log('dispatching event to socket', ' : ', type, data);

    let message=new Message;
    message.type=type;
    message.data=data;

    if(this.config.rawBuffer){
        this.log(this.config.encoding)
        message=Buffer.from(type,this.config.encoding);
    }else{
        message=eventParser.format(message);
    }
    
    socket.write(message);
}

function broadcast(type,data){
    this.log('broadcasting event to all known sockets listening to ', this.path,' : ', type, data);
    let message=new Message;
    message.type=type;
    message.data=data;

    if(this.config.rawBuffer){
        message=Buffer.from(type,this.config.encoding);
    }else{
        message=eventParser.format(message);
    }

    for(let i=0, count=this.sockets.length; i<count; i++){
        this.sockets[i].write(message);
    }
}

function serverClosed(){
    for(let i=0, count=this.sockets.length; i<count; i++){
        let socket=this.sockets[i];
        let destroyedSocketId=false;

        if(socket){
            if(socket.readable){
                continue;
            }
        }

        if(socket.id){
            destroyedSocketId=socket.id;
        }

        this.log('socket disconnected',destroyedSocketId.toString());

        if(socket && socket.destroy){
            socket.destroy();
        }

        this.sockets.splice(i,1);

        this.publish('socket.disconnected', socket, destroyedSocketId);

        return;
    }
}

function gotData(socket,data){
    let sock=socket;
    if(this.config.rawBuffer){
        data=Buffer.from(data,this.config.encoding);
        this.publish(
            'data',
            data,
            sock
        );
        return;
    }

    if(!sock.ipcBuffer){
        sock.ipcBuffer='';
    }

    data=(sock.ipcBuffer+=data);

    if(data.slice(-1)!=eventParser.delimiter || data.indexOf(eventParser.delimiter) == -1){
        this.log('Messages are large, You may want to consider smaller messages.');
        return;
    }

    sock.ipcBuffer='';

    data=eventParser.parse(data);

    while(data.length>0){
        let message=new Message;
        message.load(data.shift());

        // Only set the sock id if it is specified.
        if (message.data && message.data.id){
            sock.id=message.data.id;
        }

        this.log('received event of : ',message.type,message.data);

        this.publish(
            message.type,
            message.data,
            sock
        );
    }
}

function socketClosed(socket){
    this.publish(
        'close',
        socket
    );
}

function serverCreated(socket) {
    this.sockets.push(socket);

    if(socket.setEncoding){
        socket.setEncoding(this.config.encoding);
    }

    this.log('## socket connection to server detected ##');
    socket.on(
        'close',
        socketClosed.bind(this)
    );

    socket.on(
        'error',
        function(err){
            this.log('server socket error',err);

            this.publish('error',err);
        }.bind(this)
    );

    socket.on(
        'data',
        gotData.bind(this,socket)
    );

    socket.on(
        'message',
        function(msg,rinfo) {
            if (!rinfo){
                return;
            }

            this.log('Received UDP message from ', rinfo.address, rinfo.port);
            let data;

            if(this.config.rawSocket){
                data=Buffer.from(msg,this.config.encoding);
            }else{
                data=msg.toString();
            }
            socket.emit('data',data,rinfo);
        }.bind(this)
    );

    this.publish(
        'connect',
        socket
    );

    if(this.config.rawBuffer){
        return;
    }
}

function startServer() {
    this.log(
        'starting server on ',this.path
    );

    this.server=net.createServer(
        serverCreated.bind(this)
    );

    this.server.on(
        'error',
        function(err){
            this.log('server error',err);

            this.publish(
                'error',
                err
            );
        }.bind(this)
    );

    this.server.maxConnections=this.config.maxConnections;

    this.log('starting server as', 'Unix || Windows Socket');
    if (process.platform ==='win32'){
        this.path = this.path.replace(/^\//, '');
        this.path = this.path.replace(/\//g, '-');
        this.path= `\\\\.\\pipe\\${this.path}`;
    }

    this.server.listen({
        path: this.path,
        readableAll: this.config.readableAll,
        writableAll: this.config.writableAll
    }, this.onStart.bind(this));

    return;
}

export {
    Server as default,
    Server
};
