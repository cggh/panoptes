// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
//var casper = require('casper').create({
//    logLevel: "debug"
//}/);
//casper.on('remote.message', function(message) {
//    console.log(message);
//});

casper.start('http://localhost:8000/index.html');
casper.viewport(1280, 1024);

casper.waitForSelector('#WizBoxButtonFinish');
casper.then(function(response) {
    this.capture('1.png');
	this.click('#WizBoxButtonFinish');
});

casper.waitForSelector('#WizBoxButtonFinish');
casper.then(function(response) {
    this.capture('2.png');
	this.click('#WizBoxButtonFinish');
});

casper.waitForSelector('#AutoControlID_12');
casper.then(function(response) {
    this.capture('3.png');
//	this.click('#WizBoxButtonFinish');
});


casper.run();
