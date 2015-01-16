var http = require('http');
var slimer = require('../node-slimerjs');
var server;

module.exports = {
    setUp: function (cb) {
        server = http.createServer(function(request,response){
            response.writeHead(200,{"Content-Type": "text/html"});
            response.end('<html><head><script>console.log("handled on slimer-side")</script></head><body><h1>Hello World</h1></body></html>');
        }).listen(cb);
    },
    tearDown: function (cb) {
        server.close(cb);
    },
    testSlimerPageSetFn: function (test) {
        var url = 'http://localhost:'+server.address().port+'/';
        slimer.create(errOr(function (sl) {
            sl.createPage(errOr(function (page) {
                var messageForwardedByOnConsoleMessage = undefined;
                var localMsg = undefined;
                page.onConsoleMessage = function (msg) { messageForwardedByOnConsoleMessage = msg; };
                page.setFn('onCallback', function (msg) { localMsg = msg; page.onConsoleMessage(msg); });
                page.open(url, errOr(function () {
                    test.ok(localMsg === undefined);
                    test.equal(messageForwardedByOnConsoleMessage, "handled on slimer-side");
                    sl.on('exit', function () { test.done() });
                    sl.exit();
                }));
            }));
        }), {ignoreErrorPattern: /CoreText performance note/});

        function errOr(fn) {
            return function(err, res) {
                test.ifError(err);
                fn(res);
            }
        }
    },
};
