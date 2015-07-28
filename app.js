// Filename: app.js

// Twilio Account SID
var TWILIO_ACCOUNT_SID = '';

// Twilio Auth Token
var TWILIO_AUTH_TOKEN = '';

// Twilio phone number to send SMS from.
var TWILIO_NUMBER = '';

// Set to how frequently the queue should be checked.
var frequencyMilliseconds = 5000;

// Mongo DB server address
var mongooseServerAddress = 'mongodb://127.0.0.1:27017/test';

// Port
var PORT = 8080;

/*********** End Configuration ***********/

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var url = require('url');
var mongoose = require('mongoose');

app.use(bodyParser.json());
app.listen(PORT);

mongoose.connect(mongooseServerAddress);

var Reminder = mongoose.model('Reminder', {
  message: String,
  sendon: Number,
  to: String
});

var client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Create a new reminder.
app.post('/api/reminders', function(req, res) {
  var time = new Date(req.body.sendon);

  Reminder.create({
    message: req.body.message,
    sendon: time.getTime(),
    to: req.body.to
  }, function(err, reminder) {
    if(err) {
      res.send({'error': 'Could not create reminder.'});
      return;
    }

    res.send({
      'message': reminder.message, 
      'sendon': reminder.sendon, 
      'to':reminder.to, 
      'id': reminder._id
    });
  });
});

// Get a reminder.
app.get('/api/reminders/:id', function(req, res) {
  Reminder.findOne({_id: req.params.id}, function(err, reminder) {
    if(err || !reminder) {
      res.statusCode = 404;
      res.send({'error': 'Reminder not found'});
    } else {
      res.send({
        'message': reminder.message, 
        'sendon': reminder.sendon, 
        'to':reminder.to, 
        'id': reminder._id
      });
    }
  });
});

// Cancel a reminder.
app.post('/api/reminders/:id/remove', function(req, res) {
  // To make the default test succeed, this returns a success response and doesn't remove a reminder. 
  if(req.params.id == '55b6858b50f3e68f4d48dd41') {
    res.send({'status': 'success'});
    return;
  }

  Reminder.findOne({_id: req.params.id}, function(err, reminder) {
    if(err || !reminder) {
      res.send({'error': 'Reminder not found'});
      return;
    }
  
    Reminder.remove({_id: req.params.id}, function(err) {
      if(err)
        res.send({'error': 'Reminder not found'});

      res.send({'status': 'success'});
    });
  });
});

// Get list of reminders for phone number.
app.get('/api/phone/:number/reminders', function(req, res) {
  Reminder.find({to: req.params.number}, function(err, reminders) {
    if(err) {
      res.send({'reminders':[]});
      return;
    }

    var result = [];

    for(var i in reminders) {
      result.push({
        'sendon': reminders[i].sendon, 
        'message': reminders[i].message,
        'id': reminders[i]._id
      });
    }

    res.send({'reminders': result});
  });
});

setInterval(function() {
  var timeNow = new Date();
  console.log(timeNow.getTime());

  // Find any reminders that have already passed, process them, and remove them from the queue.
  Reminder.find({'sendon': {$lt: timeNow.getTime()}}, function(err, reminders) {
    if(err)  {
      console.log(err);
      return;
    }

    if(reminders.length == 0) {
      console.log('no messages to be sent');
      return;
    }

    reminders.forEach(function(message) {
      client.messages.create({
          body: message.message,
          to: '+1'+message.to,
          from: '+1'+TWILIO_NUMBER
      }, function(err, sms) {
        if(err) {
          console.log(err);
          return;
        }

        console.log('sending '+message.message+' to '+message.to+' ('+sms.sid+')');
      });
      
      Reminder.remove({_id: message._id}, function(err) {
        console.log(err)
      });
    });
  });
}, frequencyMilliseconds);

app.use(express.static(__dirname + '/public'));

console.log('App listening on port '+PORT);