var slimer=require('../node-slimerjs');

exports.testSlimerInjectJs = function(test) {
    slimer.create(function (error,sl) {
        test.ifError(error);
        sl.injectJs('tests/files/injecttest.js', function (err) {
            test.ifError(err);
            sl.exit();
            test.done();
        });
    });
};
