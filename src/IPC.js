import Defaults from './entities/Defaults.js';
import Client from './dao/client.js';
import Server from './dao/socketServer.js';
import util from 'util';

class IPC{
    constructor(){

    }
    
    //public members
    config=new Defaults;
    of={};
    server=false;

    //protected methods
    connectTo(id, path, callback){
        if(typeof path == 'function'){
            callback=path;
            path=false;
        }

        if(!callback){
            callback=emptyCallback;
        }

        if(!id){
            this.log(
                'Service id required',
                'Requested service connection without specifying service id. Aborting connection attempt'
            );
            return;
        }

        if(!path){
            this.log(
                'Service path not specified, so defaulting to',
                'ipc.config.socketRoot + ipc.config.appspace + id',
                (this.config.socketRoot+this.config.appspace+id).data
            );
            path=this.config.socketRoot+this.config.appspace+id;
        }

        if(this.of[id]){
            if(!this.of[id].socket.destroyed){
                this.log(
                    'Already Connected to',
                    id,
                    '- So executing success without connection'
                );
                callback();
                return;
            }
            this.of[id].socket.destroy();
        }

        this.of[id] = new Client(this.config,this.log);
        this.of[id].id = id;
        (this.of[id].socket)? (this.of[id].socket.id=id):null;
        this.of[id].path = path;

        this.of[id].connect();

        callback(this);
    }
    disconnect(id){
        if(!this.of[id]){
            return;
        }

        this.of[id].explicitlyDisconnected=true;

        this.of[id].off('*','*');
        if(this.of[id].socket){
            if(this.of[id].socket.destroy){
                this.of[id].socket.destroy();
            }
        }

        delete this.of[id];
    }
    serve(path, callback){
        if(typeof path=='function'){
            callback=path;
            path=false;
        }
        if(!path){
            this.log(
                'Server path not specified, so defaulting to',
                'ipc.config.socketRoot + ipc.config.appspace + ipc.config.id',
                this.config.socketRoot+this.config.appspace+this.config.id
            );
            path=this.config.socketRoot+this.config.appspace+this.config.id;
        }

        if(!callback){
            callback=emptyCallback;
        }

        this.server=new Server(
            path,
            this.config,
            log
        );

        this.server.on(
            'start',
            callback
        );
    }
    get log(){
        return log;
    }
}

    

function log(...args){
    if(this.config.silent){
        return;
    }

    for(let i=0, count=args.length; i<count; i++){
        if(typeof args[i] != 'object'){
            continue;
        }

        args[i]=util.inspect(
            args[i],
            {
                depth:this.config.logDepth,
                colors:this.config.logInColor
            }
        );
    }

    this.config.logger(
        args.join(' ')
    );
}

function emptyCallback(){
    //Do Nothing
}

export {
    IPC as default,
    IPC
};
