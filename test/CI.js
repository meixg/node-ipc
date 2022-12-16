//TCP TESTS
import cmd from 'node-cmd';
import {run as unixClientRun} from './unix/client.js';


function logOutput(name,err, data, stderr){
    console.log(`
        
        
        ${name} OUTPUT
        
        
    `);

    console.log(err, data, stderr)
}

cmd.run(
    'node ./test/unix/unixServer.js',
    function(err, data, stderr){
        logOutput('unix/posix',err, data, stderr)       
    }
);
cmd.run(
    'node ./test/unix/unixServerSync.js',
    function(err, data, stderr){
        logOutput('unix/posix sync',err, data, stderr)       
    }
);

await unixClientRun();