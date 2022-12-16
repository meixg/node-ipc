import net from 'net';
import EventParser from '../entities/EventParser.js';
import Message from 'js-message';
import Queue from 'js-queue';
import Events from 'event-pubsub';

let eventParser = new EventParser();

class Client extends Events{
    constructor(config,log){
        super();
        this.config=config;
        this.log=log;
        this.publish=super.emit;
        
        (config.maxRetries)? this.retriesRemaining=config.maxRetries:0;

        eventParser=new EventParser(this.config);
    }

    Client=Client;
    queue =new Queue;
    socket=false;
    connect=connect;
    emit=emit;
    retriesRemaining=0;
    explicitlyDisconnected=false;
}

function emit(type,data){
    this.log('dispatching event to ', this.id, this.path, ' : ', type, ',', data);

    let message=new Message;
    message.type=type;
    message.data=data;

    if(this.config.rawBuffer){
        message=Buffer.from(type,this.config.encoding);
    }else{
        message=eventParser.format(message);
    }

    //volitile emit
    if(!this.config.sync){
        this.socket.write(message);
        return;
    }

    //sync, non-volitile, ack emit
    this.queue.add(
        syncEmit.bind(this,message)
    );
}

function syncEmit(message){
    this.log('dispatching event to ', this.id, this.path, ' : ', message);
    this.socket.write(message);
}

function connect(){
    //init client object for scope persistance especially inside of socket events.
    let client=this;

    client.log('requested connection to ', client.id, client.path);
    if(!this.path){
        client.log('\n\n######\nerror: ', client.id ,' client has not specified socket path it wishes to connect to.');
        return;
    }

    const options={};

    client.log('Connecting client on Unix Socket :', client.path);

    options.path=client.path;

    if (process.platform ==='win32' && !client.path.startsWith('\\\\.\\pipe\\')){
        options.path = options.path.replace(/^\//, '');
        options.path = options.path.replace(/\//g, '-');
        options.path= `\\\\.\\pipe\\${options.path}`;
    }

    client.socket = net.connect(options);

    client.socket.setEncoding(this.config.encoding);

    client.socket.on(
        'error',
        function(err){
            client.log('\n\n######\nerror: ', err);
            client.publish('error', err);

        }
    );

    client.socket.on(
        'connect',
        function connectionMade(){
            client.publish('connect');
            client.retriesRemaining=client.config.maxRetries;
            client.log('retrying reset');
        }
    );

    client.socket.on(
        'close',
        function connectionClosed(){
            client.log('connection closed' ,client.id , client.path,
            client.retriesRemaining, 'tries remaining of', client.config.maxRetries
        );

            if(
                client.config.stopRetrying ||
                client.retriesRemaining<1 ||
                client.explicitlyDisconnected

            ){
                client.publish('disconnect');
                client.log(
                    (client.config.id),
                    'exceeded connection rety amount of',
                    ' or stopRetrying flag set.'
                );

                client.socket.destroy();
                client.publish('destroy');
                client=undefined;

                return;
            }

            setTimeout(
                function retryTimeout(){
                    if (client.explicitlyDisconnected) {
                        return;
                    }
                    client.retriesRemaining--;
                    client.connect();
                }.bind(null,client),
                client.config.retry
            );

            client.publish('disconnect');
        }
    );

    client.socket.on(
        'data',
        function(data) {
            client.log('## received events ##');
            if(client.config.rawBuffer){
                client.publish(
                   'data',
                   Buffer.from(data,client.config.encoding)
                );
                if(!client.config.sync){
                    return;
                }

                client.queue.next();
                return;
            }

            if(!this.ipcBuffer){
                this.ipcBuffer='';
            }

            data=(this.ipcBuffer+=data);

            if(data.slice(-1)!=eventParser.delimiter || data.indexOf(eventParser.delimiter) == -1){
                client.log('Messages are large, You may want to consider smaller messages.');
                return;
            }

            this.ipcBuffer='';

            const events = eventParser.parse(data);
            const eCount = events.length;
            for(let i=0; i<eCount; i++){
                let message=new Message;
                message.load(events[i]);

                client.log('detected event', message.type, message.data);
                client.publish(
                   message.type,
                   message.data
                );
            }

            if(!client.config.sync){
                return;
            }

            client.queue.next();
        }
    );
}

export {
    Client as default,
    Client
};
