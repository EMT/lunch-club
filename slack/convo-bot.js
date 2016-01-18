var Botkit = require('Botkit');
var Store = require("jfs");
var db = new Store("data",{pretty:true, type:'single'});





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

controller.hears(['lunch club', 'lunchclub', 'lunch', 'review'],['direct_mention','direct_message'],function(bot,message) {
  bot.startConversation(message, askWhen);
});

askWhen = function(response, convo) {
  convo.say("¿Qué?");
  convo.say("Oh, lunch...");
  convo.ask("When did you go?", function(response, convo) {
    // askWhere(response, convo);
    storeData(response, convo);
    convo.next();
  });
}
askWhere = function(response, convo) {
  convo.ask("Sí, where did you go?", function(response, convo) {
    askWinner(response, convo);
    convo.next();
  });
}
askWinner = function(response, convo) {
  convo.ask("Sí, who had the best meal?", function(response, convo) {
    askLoser(response, convo);
    convo.next();
  });
}
askLoser = function(response, convo) {
  convo.ask("Sí, who had the worst meal?", function(response, convo) {
    askMeatyness(response, convo);
    convo.next();
  });
}
askMeatyness = function(response, convo) {
  convo.ask("Sí, who had the most meat?", function(response, convo) {
    askCheesyness(response, convo);
    convo.next();
  });
}
askCheesyness = function(response, convo) {
  convo.ask("Sí, who had the most cheese?", function(response, convo) {
    askRating(response, convo);
    convo.next();
  });
}
askRating = function(response, convo) {
  convo.ask("Sí, what would you rate it out of 10?", function(response, convo) {
    convo.say("Sí! i'll tell the chef, Good by.");
    storeData(response, convo);
    convo.next();
  });
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
      // something happened that caused the conversation to stop prematurely
    }

  });
}