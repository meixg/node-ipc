import IPC from './src/IPC.js';

class IPCModule extends IPC{
    constructor(){
        super();

    }

    IPC=IPC;
}

const singleton=new IPCModule;

export {
    singleton as default,
    IPCModule
}
