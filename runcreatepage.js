var slimer=require('./node-slimerjs');
//var slimer=require('./node-phantom-simple');

console.log('run');
slimer.create(function (error, sl) {
    console.log('create err: ' + error);
    sl.createPage(function (err,page) {
        console.log('create page err: ' + err);
        console.log('will exit');
	sl.exit();
	console.log('exit');
    });
});

