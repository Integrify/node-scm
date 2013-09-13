var scm = require('../scm.js'),
    assert = require('assert');

//
// test that a common service exists
//


scm.exists('Dhcp2',function(err,exists) {

    //assert.ifError(err);

    console.log('DHCP Client ' + (exists === true? 'does exist' : 'does not exist'));
})