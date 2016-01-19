var Store = require("jfs");
var express = require('express');
var hbs = require('hbs');
var _ = require('underscore');

var app = express();
var db = new Store("../data",{pretty:true, type:'single'});

app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.set('views', __dirname + '/views')
app.use('/assets', express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.render('index',{title:"The Lunch Club", reviews: getData()});
});

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

function getData(reversed) {
	console.log('Grabbing some data from data.json');
	var data = db.allSync();
	var dataArrayed = Object.keys(data).map(function(k) { return data[k] });
	var dataReversed = dataArrayed.sort().reverse();

	if (reversed) {
		return dataReversed;
	} else {
		return dataArrayed;
	}
}

app.listen(5000);
console.log('Express server listening on port 5000')