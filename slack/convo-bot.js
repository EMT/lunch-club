// require('dotenv').config();

var Botkit   = require('botkit');
var Store    = require("jfs");
var _        = require('underscore');
var request  = require('request');
var chrono   = require('chrono-node');
var moment   = require('moment');
var db       = new Store("../data",{pretty:true, type:'single'});
var Entities = require('html-entities').XmlEntities;

entities = new Entities();

// Check if we have a slack api token set, if we don't then cancel out.
if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

// Debug options
var controller = Botkit.slackbot({
 debug: false
});

// Instead of only checking for specific strings, like when we do findMyself(string)
// we instead check for a variety to hopefully catch common alternatives.
//
// Also useful for the rating questions were we only want to accept three possible
// answers.
var phrases = {
  cancel: new RegExp(/^(cancel|escape|stop)/i),
  me: new RegExp(/^(me|myself|i did)/i),
  rating: new RegExp(/^(high|medium|low|zero)/i)
}

// Setup a new botkit Bot using the slack api token we defined in our environment
controller.spawn({
  token: process.env.token
}).startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }
});

// Check if we are connected to the slack Real Time Messaging API
controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected!');
});

// Check if we get kicked off the Real Time Messaging API
controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed');
  reconnectRTM(controller);
});

function reconnectRTM(controller) {
  controller.startRTM(function(err) {
    if (err) {
      throw new Error(err);
      reconnectRTM(controller);
    }
  });
}

controller.hears(['hello', 'hi', 'hiya', 'hey'],['direct_mention','direct_message'],function(bot,message) {
  bot.reply(message, 'Hola, I know nothing... but i learn, i learn, i learn!');
});

/*
   Remove the latest review from the database when a user:

   - Direct Messages the bot with: remove latest
   - Direct Mentions the bot with: @waiter-bot remove latest
*/

controller.hears(['remove (.*)'],['direct_mention','direct_message'],function(bot,message) {

  var reviews = db.allSync();
  var reviewsKeys = _.keys(reviews)
  var keysLength = reviewsKeys.length;
  var reviewID = message.match[1]

  reviewsKeys.forEach(function(key,index) {
      if (reviewID == 'latest' || reviewID == 'undefined') {
        if (index + 1 == keysLength) {
          db.delete(key, function(err){
            bot.reply(message, 'Sí, latest review removed.');
          });
        }
      } else {
        if (reviewID == key) {
          db.delete(reviewID, function(err){
            bot.reply(message, 'Sí, (' + key + ') was removed');
          })
        }
      }
  });

});

/*
   List all the reviews in one messages with an id and date.

   - Direct Messages the bot with: list all
   - Direct Mentions the bot with: @waiter-bot list all
*/

controller.hears(['list all'],['direct_mention','direct_message'],function(bot,message) {

  var reviews = db.allSync();
  var reviewsKeys = _.keys(reviews)
  var keysLength = reviewsKeys.length;

  reviewsKeys.forEach(function(key,index) {
      bot.reply(message, key + ' - ' +index);
  });

});

/*
   Start the lunch review conversation when the user:

   - Direct Messages the bot with: lunchclub, lunch, lunch club, review
   - Direct Mentions the bot with: @waiter-bot lunchclub, lunch, lunch club, review
*/

controller.hears(['lunch club', 'lunchclub', 'lunch', 'review'],['direct_mention','direct_message'],function(bot,message) {
  bot.startConversation(message, askWhere);
});

/*
   Start the conversation tree:
   Each function will call the next question at the end of itself
   and then advance the conversation queue along to the next question.

   We also check if the user wants to cancel out of the conversation at
   the start of each question, using the checkCancel function.
*/

askWhere = function(response, convo) {
  convo.say("¿Qué?");
  convo.ask("Oh, where did you go?", function(response, convo) {
    checkCancel(response, convo);
    askLink(response, convo);
    convo.next();
  }, {'key': 'where'});
}
askLink = function(response, convo) {
  convo.ask("Sí, can you give me a link for the place (google maps/website) ?", function(response, convo) {
    checkCancel(response, convo);
    response.text = handleUrl(response.text);
    askWhen(response, convo);
    convo.next();
  }, {'key': 'link'});
}
askWhen = function(response, convo) {
  convo.ask("Sí, when did you go?", function(response, convo) {
    checkCancel(response, convo);
    response.text = handleDate(response.text);
    askWinner(response, convo);
    convo.next();
  }, {'key': 'when'});
}
askWinner = function(response, convo) {
  convo.ask("Sí, who had the best meal?", function(response, convo) {
    checkCancel(response, convo);

    if (phrases.me.test(response.text)) {
      findMyself(response.user, function(results) {
        if (results) {
          response.text = results.capitalize();
        }
      });
    }

    askTopic(response, convo);
    convo.next();
  }, {'key': 'winner'});
}
askTopic = function(response, convo) {
  convo.ask("Sí, what did you talk about?", function(response, convo) {
    checkCancel(response, convo);
    askMeatyness(response, convo);
    convo.next();
  }, {'key': 'topic'});
}
askMeatyness = function(response, convo) {
  convo.ask("Sí, would you rate the meatiness high, medium, low or zero?", function(response, convo) {
    checkCancel(response, convo);

    checkRatingFormatting(response, convo, function(){
      askCheesyness(response, convo);
      convo.next();
    });

  }, {'key': 'meat'});
}
askCheesyness = function(response, convo) {
  convo.ask("Sí, would you rate the cheesiness high, medium, low or zero?", function(response, convo) {
    checkCancel(response, convo);

    checkRatingFormatting(response, convo, function(){
      askRating(response, convo);
      convo.next();
    });

    convo.next();
  }, {'key': 'cheese'});
}
askRating = function(response, convo) {
  convo.ask("Sí, what would you rate it out of 10?", function(response, convo) {
    checkCancel(response, convo);

    convo.say("Sí! i'll tell the chef, Good bye.");
    storeData(response, convo);
    convo.next();
  }, {'key': 'rating'});
}

/*
  Helper Functions
*/

// Check if the response to the rating questions, e.g. meatiness, matches the
// accepted list of responses defined in phrases.rating. If they do not then
// repeat the question
checkRatingFormatting = function(response, convo, callback) {
    if (phrases.rating.test(response.text)) {
      callback();
    } else {
      convo.say('Please use the ratings: high, medium or low.')
      convo.repeat();
      convo.next();
    }
}

// Check if the response contains the phrase cancel, escape or stop. If it does
// then exit out of the current conversation immediately.
checkCancel = function(response, convo) {
  if (phrases.cancel.test(response.text)) {
    convo.stop()
  }
}

// Call the Slack users API to check the user attached to the userid passed in.
findMyself = function(userid, callback) {
  request('https://slack.com/api/users.info?token=' + process.env.token+ '&user=' + userid +'&pretty=1', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var userDetails = JSON.parse(body);
        callback(userDetails.user.name);
    }
  })
}

// If the conversation ended and it was fully completed then we store the users responses
// in the data.json file found in the parent directory.
storeData = function(response, convo) {
  convo.on('end',function(convo) {
    if (convo.status=='completed') {
      var res = convo.extractResponses();
      // Add the time it was created.
      res.created = Date.now().toString();
      res.where = entities.decode(res.where);

      console.log('[Saved]: ' + JSON.stringify(res));
      // save with generated ID
      db.save(res, function(err, id){
        // id is a unique ID
        if (err) {
          console.log(err);
        }
      });
    }
  });
}

// Parse the date out of the string the user responded with, this is fairly
// flexible thanks to the chrono.js library. Then format the parsed date with
// moment.js so everything is nice and uniform.
handleDate = function(date) {
    var parsedDate = chrono.parseDate(date);
    var formattedDate = moment(parsedDate).format('DD/MM/YYYY');
    return formattedDate;
}

// Check if slack added the < and > characters to the start and end of the string,
// if it did then chop them off.
handleUrl = function(url) {
  if (url.substring(url.length-1) == '>') {
    url = url.slice(1, -1);
  }

  return url;
}


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
