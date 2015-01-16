var slimer=require('../node-slimerjs');

exports.testSlimerCreatePage = function(test) {
    slimer.create(function (error, sl) {
        test.ifError(error);
        sl.createPage(function (err,page) {
            test.ifError(err);
            sl.exit();
            test.done();
        });
    });
};
