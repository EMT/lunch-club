var Store 	= require("jfs");
var express = require('express');
var hbs 	= require('hbs');
var _ 		= require('underscore');
var app 	= express();
var db 		= new Store("../data",{pretty:true, type:'single'});

// Set our views to use handlebars for compiling but still use .html extension instead of .hbs
app.set('view engine', 'html');
app.engine('html', hbs.__express);

// Setup the views directory
app.set('views', __dirname + '/views')

// Setup the public directory, is it worth caching this ?
app.use('/assets', express.static(__dirname + '/public'));

// Setup our one and only route, grab the reviews data from data.json
app.get('/', function(req, res) {
    res.render('index',{title:"The Lunch Club", reviews: getData()});
});

// Start listening on the port defined in the env or port 5000 as default
app.listen(5000);
console.log('Express server listening on port 5000');

// Little helper for handlebars
hbs.registerHelper('ratings', function() {
  var rating = Math.round(hbs.handlebars.escapeExpression(this.rating));
  var ratingsList = '';

  for (var i = 0; i < 10; i++) {
  	if (i < rating) {
  		ratingsList += '<li><img src="/assets/triangle-filled.svg" alt=""></li>'
  	} else {
  		ratingsList += '<li><img src="/assets/triangle.svg" alt=""></li>'
  	}
  };

  return new hbs.handlebars.SafeString(ratingsList);
});

// Grab the data from data.json file in the shared parent directory.
// no point using a db for something this small,if it starts to
// slow down then we can look at implimenting something.
function getData() {
	console.log('Grabbing some data from data.json');
	var data = db.allSync();
	var dataArrayed = Object.keys(data).map(function(k) { return data[k] }).reverse();
	return dataArrayed;
}