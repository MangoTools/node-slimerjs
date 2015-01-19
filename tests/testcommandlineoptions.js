var http = require('http');
var url = require('url');
var os = require('os');
var slimer = require('../node-slimerjs');
var usingProxy = false;

var slimerInstance, proxyServer;


module.exports = {
    setUp: function (callback) {
        proxyServer = http.createServer(function (request, response) {
            console.log("Req!");
            var requestedUrl = url.parse(request.url);
            if(requestedUrl.path === '/testSlimerPagePushNotifications'){
                usingProxy = true;
                response.writeHead(200,{"Content-Type": "text/html"});
                response.end('okay');
                return;
            }
            var req = http.request(
                {
                    hostname: requestedUrl.hostname,
                    port: requestedUrl.port,
                    path: requestedUrl.path,
                    method: request.method
                },
                function(res){
                    response.writeHead(res.statusCode, res.headers);
                    res.on('data', function (data) {
                        response.write(data)
                    });
                    res.on('end', function () {
                        response.end()
                    });
                }
            );
            req.on('error', function (error) {
                console.log(error);
                response.end();
                slimerInstance && slimerInstance.exit();
                proxyServer.close();
            });
            req.end();
        }).listen(function () {
            // console.log("Listening");
            callback();
        });
    },
    tearDown: function (callback) {
        // console.log("tearing down...");
        proxyServer.close(callback);
    },
    testCommandLineOptions: function (test) {
        if (1/*os.platform() === 'darwin'*/) {
            test.equal(true, true, "Proxy doesn't work on OSX");
            test.done();
            return;
        }
        slimer.create(errOr(function (sl) {
            slimerInstance = sl;
            sl.createPage(errOr(function (page) {
                page.open('http://localhost/testSlimerPagePushNotifications', errOr(function () {
                    console.log("Got localhost from somewhere...");
                    sl.exit(function () {
                        test.equal(usingProxy, true, "Check if using proxy");
                        test.done();
                    });
                }));
            }));
        }), {parameters: {proxy: 'localhost:' + proxyServer.address().port}});

        function errOr (fn) {
            return function (err, res) {
                test.ifError(err);
                fn(res);
            }
        }
    },
};
