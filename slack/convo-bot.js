var Botkit = require('Botkit');
var Store = require("jfs");
var _ = require('underscore');
var request = require('request');

var db = new Store("../data",{pretty:true, type:'single'});

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
 debug: false
});

controller.spawn({
  token: process.env.token
}).startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }
});

controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected!');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed');
  // we may want to attempt to re-open
});

controller.hears(['remove latest'],['direct_mention','direct_message'],function(bot,message) {

  var reviews = db.allSync();
  var reviewsKeys = _.keys(reviews)
  var keysLength = reviewsKeys.length;

  reviewsKeys.forEach(function(key,index) {
      if (index + 1 == keysLength) {
        db.delete(key, function(err){
          bot.reply(message, 'Sí, latest review removed.');
          console.log(key, index);
        });
      }
  });

});

controller.hears(['lunch club', 'lunchclub', 'lunch', 'review'],['direct_mention','direct_message'],function(bot,message) {
  bot.startConversation(message, askWhen);
});

askWhen = function(response, convo) {
  convo.say("¿Qué?");
  convo.ask("Oh, lunch... when did you go?", function(response, convo) {
    checkCancel(response, convo);
    askWhere(response, convo);
    convo.next();
  }, {'key': 'when'});
}
askWhere = function(response, convo) {
  convo.ask("Sí, where did you go?", function(response, convo) {
    askWinner(response, convo);
    convo.next();
  }, {'key': 'where'});
}
askWinner = function(response, convo) {
  convo.ask("Sí, who had the best meal?", function(response, convo) {

    if (response.text == 'me' || response.text == 'myself') {
      findMyself(response.user, function(results) {
        if (results) {
          response.text = results.capitalize();
        }
      });
    }

    askLoser(response, convo);
    convo.next();
  }, {'key': 'winner'});
}
askLoser = function(response, convo) {
  convo.ask("Sí, who had the worst meal?", function(response, convo) {

    if (response.text == 'me' || response.text == 'myself') {
      findMyself(response.user, function(results) {
        if (results) {
          response.text = results.capitalize();
        }
      });
    }

    askMeatyness(response, convo);
    convo.next();
  }, {'key': 'loser'});
}
askMeatyness = function(response, convo) {
  convo.ask("Sí, would you rate the cheesyness high, medium or low?", function(response, convo) {
    askCheesyness(response, convo);
    convo.next();
  }, {'key': 'meat'});
}
askCheesyness = function(response, convo) {
  convo.ask("Sí, would you rate the meatyness high, medium or low?", function(response, convo) {
    askRating(response, convo);
    convo.next();
  }, {'key': 'cheese'});
}
askRating = function(response, convo) {
  convo.ask("Sí, what would you rate it out of 10?", function(response, convo) {
    convo.say("Sí! i'll tell the chef, Good bye.");
    storeData(response, convo);
    convo.next();
  }, {'key': 'rating'});
}

checkCancel = function(response, convo) {
  if (response.text == 'cancel') {
    convo.stop()
  }
}

findMyself = function(userid, callback) {
  request('https://slack.com/api/users.info?token=' + process.env.token+ '&user=' + userid +'&pretty=1', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var userDetails = JSON.parse(body);
        callback(userDetails.user.name);
    }
  })
}

storeData = function(response, convo) {
  convo.on('end',function(convo) {
    if (convo.status=='completed') {
      var res = convo.extractResponses();
      console.log(res);

      res.created = Date.now().toString();

      // save with generated ID
      db.save(res, function(err, id){
        // id is a unique ID
      });

    } else {
      convo.sayFirst("Okay, i'll leave you alone."); // This isn't firing for some reason ?
    }

  });
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}