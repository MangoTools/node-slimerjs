var slimer = require('../node-slimerjs');

exports.testSlimerPageRelease = function (test) {
    slimer.create(function (error, sl) {
        test.ifError(error);
        sl.createPage(function (err, page) {
            test.ifError(err);
            page.close(function (err) {
                test.ifError(err);
                sl.on('exit', function () { test.done() });
                sl.exit();
            });
        });
    });
};
