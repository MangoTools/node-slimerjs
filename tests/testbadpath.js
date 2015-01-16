var slimer=require('../node-slimerjs');

exports.testSlimerCreatePagePath = function(test) {
    slimer.create(function (error,sl) {
        test.notStrictEqual(null, error, "Bad path produces an error");
        test.done();
    },{slimerPath:'@@@', ignoreErrorPattern: /execvp/});
};
