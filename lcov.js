const lcov2badge = require('lcov2badge');
const {writeFileSync} = require('fs');

lcov2badge.badge(
    './coverage/lcov.info', 
    function(err, svgBadge){
        if (err) throw err;
        writeFileSync('./coverage/lcov.svg', svgBadge); 
    }
);