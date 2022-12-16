import os from 'os';

class Defaults{

    constructor(){

    }

    appspace='app.';
    socketRoot='/tmp/';
    id=os.hostname();

    encoding='utf8';
    rawBuffer=false;
    sync=false;
    unlink=true;

    delimiter='\f';

    silent=false;
    logDepth=5;
    logInColor=true;
    logger=console.log.bind(console);

    maxConnections=100;
    retry=500;
    maxRetries=Infinity;
    stopRetrying=false;

    readableAll = false;
    writableAll = false;
}

export {
    Defaults as default,
    Defaults
}
