//var casper = require('casper').create({
//    logLevel: "debug"
//}/);
//casper.on('remote.message', function(message) {
//    console.log(message);
//});

casper.start('http://localhost:8000/static/main.html');
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
