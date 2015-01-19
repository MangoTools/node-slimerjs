//var system = require('system');
var page   = require('webpage').create();

console.log('page: ' + page);

page.open('http://google.com/').then(function(status){
  console.log(page.title);
  page.close();
  phantom.exit();
  console.log('Fin');
});
page.onError = function(msg, trace){
  console.log(msg);
};

