var slimer = require('../node-slimerjs');

exports.testSlimerPageSetGet=function (test) {
    slimer.create(function (error, sl){
        test.ifError(error);
        sl.createPage(function (err, page){
            test.ifError(err);
            page.get('viewportSize',function (err, oldValue) {
                test.ifError(err);
                page.set('viewportSize', {width:800,height:600}, function (err) {
                    test.ifError(err);
                    page.get('viewportSize',function (err, newValue) {
                        test.ifError(err);
                        test.notEqual(oldValue, newValue);
                        var rnd=Math.floor(100000*Math.random());
                        page.set('zoomFactor', rnd, function (err) {
                            test.ifError(err);
                            page.get('zoomFactor',function (err, zoomValue) {
                                test.ifError(err);
                                test.equal(zoomValue, rnd);
                                page.get('settings',function (err, oldSettings) {
                                    test.ifError(err);
                                    page.set('settings', {'userAgent':'node-slimer tester'}, function (err) {
                                        test.ifError(err);
                                        page.get('settings',function (err, newSettings) {
                                            test.ifError(err);
                                            test.notEqual(oldSettings.userAgent, newSettings.userAgent);
                                            sl.on('exit', function () { test.done() });
                                            sl.exit();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};
