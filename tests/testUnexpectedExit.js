var slimer=require('../node-slimerjs');

exports.testUnexpectedExit = function(test) {
    slimer.create(function (error, sl) {
        test.ifError(error);
        sl.createPage(function (err,page) {
            sl.exit();  // exit the slimer process at a strange time
            page.open('http://www.google.com', function(err, result) {
              test.ok(!!err); // we expect an error
              test.done();
            })
        });
    });
};
