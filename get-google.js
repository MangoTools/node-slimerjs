var slimer=require('./node-slimerjs.js');
slimer.create(function(err,sl) {
	sl.createPage(function(err,page){
		return page.open("https://sailorzone.fr/", function(err, status) {
			console.log("opened site? ", status);
			page.get('content', function(err, html){
				console.log(html);
				sl.exit();
			});
			console.log(page.title);
		});
	});
});
