var http = require('http');
var slimer = require('../node-slimerjs');
var server;

module.exports = {
    setUp: function (cb) {
        server = http.createServer(function (request,response) {
            response.writeHead(200,{"Content-Type": "text/html"});
            response.end('<html><head></head><body>Hello World</body></html>');
        }).listen(cb);
    },
    tearDown: function (cb) {
        server.close(cb);
    },
    testSlimerPageOpen: function (test) {
        slimer.create(function (error,sl) {
            // console.log("Slimer created...");
            test.ifError(error);
            sl.createPage(function (err,page) {
                test.ifError(err);
               page.open('http://localhost:'+server.address().port, function (err,status) {

                    test.ifError(err);
                    test.equal(status,'success');
                    sl.on('exit', function () {
                        test.done();
                    })
                    sl.exit();
                });
            });
        }, {ignoreErrorPattern: /CoreText performance note/});
    },
};
