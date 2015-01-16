var http = require('http');
var slimer = require('../node-slimerjs');
var server;

module.exports = {
    setUp: function (cb) {
        server = http.createServer(function (request,response) {
            if (request.url==='/test.js') {
                response.writeHead(200, {"Content-Type": "text/javascript"});
                response.end('document.querySelector("h1").textContent="Hello Test";');
            }
            else {
                response.writeHead(200,{"Content-Type": "text/html"});
                response.end('<html><head></head><body><h1>Hello World</h1></body></html>');
            }
        }).listen(cb);
    },
    tearDown: function (cb) {
        server.close(cb);
    },
    testSlimerPageEvaluate: function (test) {
        slimer.create(function (error, sl) {
            test.ifError(error, "slimer error");
            sl.createPage(function (err, page) {
                test.ifError(err, "createPage error");
                page.open('http://localhost:'+server.address().port, function (err, status) {
                    test.ifError(err, "page open error");
                    test.equal(status, 'success', "Status is success");
                    page.includeJs('http://localhost:'+server.address().port+'/test.js', function (err) {
                        test.ifError(err, "includeJs error");
                        page.evaluate(function () {
                            return [document.getElementsByTagName('h1')[0].innerText, document.getElementsByTagName('script').length];
                        }, function (err, result) {
                            test.ifError(err, "page.evaluate error");
                            test.equal(result[0], 'Hello Test', "Script was executed");
                            test.equal(result[1], 1, "Added a new script tag");
                            sl.on('exit', function () {
                                test.done();
                            });
                            sl.exit();
                        });
                    });
                });
            });
        }, {ignoreErrorPattern: /CoreText performance note/});
    },
};
