var http = require('http');
var slimer = require('../node-slimerjs');
var server;

module.exports = {
    setUp: function (cb) {
        server = http.createServer(function (request, response) {
            if (request.url==='/test.js') {
                // console.log('gotten');
                response.writeHead(200,{"Content-Type": "text/javascript"});
                response.end('document.getElementsByTagName("h1")[0].innerText="Hello Test";');
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
    testSlimerPageInjectJs: function (test) {
        slimer.create(function(error,sl){
            test.ifError(error);
            sl.createPage(function(err,page){
                test.ifError(err);
                page.open('http://127.0.0.1:'+server.address().port,function(err,status){
                    test.ifError(err);
                    test.equal(status,'success');
                    page.injectJs('tests/files/modifytest.js',function(err){
                        //no delay necessary because it should have been executed synchronously
                        test.ifError(err);
                        page.evaluate(function(){
                            return [document.getElementsByTagName('h1')[0].innerText,document.getElementsByTagName('script').length];
                        },function(err,result){
                            test.ifError(err);
                            test.equal(result[0],'Hello Test');   //the script should have been executed
                            test.equal(result[1],0);
                            sl.on('exit', function () {
                                test.done();
                            })
                            sl.exit();
                        });
                    });
                });
            });
        }, {ignoreErrorPattern: /CoreText performance note/});
    }
};
