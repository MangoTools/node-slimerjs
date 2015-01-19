var slimer=require('../node-slimerjs');

exports.testUnexpectedExit = function(test) {
/*    slimer.create(function (error, sl) {
	console.log('test unexpected exit: ', err);
        test.ifError(error);
        sl.createPage(function (err,page) {
            sl.exit();  // exit the slimer process at a strange time
            page.open('http://www.google.com').then(function(err, result) {
              test.ok(!!err); // we expect an error
              test.done();
            })
        });
    });*/
test.done();
};
