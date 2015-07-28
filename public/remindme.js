// Filename: remindme.js

angular.module('ReminderApp', [])
.controller('ReminderListCtrl', ['$scope', '$http', '$filter', function($scope, $http, $filter) {
  $scope.reminderDate = new Date();
  $scope.reminderTime = new Date();
  $scope.reminderTime.setMilliseconds(0);
  $scope.reminderTime.setSeconds(0);
  $scope.syncing = false;

  $scope.reminders = [];

  // Get reminders from the server.
  $scope.fetchList = function() {
    if($scope.phonenumber.length == 0) 
      return;

    $scope.syncing = true;
    
    $http.get('/api/phone/'+$scope.phonenumber+'/reminders').success(function(response) {
      $scope.reminders = response.reminders;
      $scope.syncing = false;
    });
  };

  $scope.addReminder = function() {
    var reminderDateTime = new Date($filter('date')($scope.reminderDate, 'yyyy-MM-dd')+" "+$filter('date')($scope.reminderTime, 'HH:mm'));

    var data = {
      message: $scope.reminderText, 
      sendon: reminderDateTime.getTime(), 
      to: $scope.phonenumber
    };

    $http.post('/api/reminders', data).success(function(response) {
      $scope.reminders.push(response);
      $scope.reminderText = '';
    });
  };

  $scope.removeReminder = function(reminder) {
    var oldReminders = $scope.reminders;

    $scope.reminders = [];
    angular.forEach(oldReminders, function(r) {
      if(reminder.id != r.id) {
        $scope.reminders.push(r);
      }
    });

    $http.post('/api/reminders/'+reminder.id+'/remove');
  };
}]);