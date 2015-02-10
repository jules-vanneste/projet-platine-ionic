angular.module('AccueilController', [])
.controller('AccueilCtrl', function($scope, $stateParams, $ionicPopup, client, store) {
  $scope.hideBackButton = true;
  ouvertureBDDandGetAdresses();

  $scope.saveAdresse = function(adresse, k, D) {
  	var geo = k+"/"+D;
  	var data = {
  		adresse: adresse,
  		geo: geo
  	}
    var addD = addData(data);
    $.when(addD).done(function(data){
    	console.log(data);
    	if(data) {
    		$scope.showAlert("Itinéraire sauvegardé", "Votre itinéraire a été sauvegardé");
    		deleteAllOptions("favSelect");
    		getAdresses("favSelect");
    	} else {
    		$scope.showAlert("Problème", "L'itinéraire n'a pu être sauvegardé. L'adresse est peut-être déjà existante");
    	}
    });
  }

  $scope.showAlert = function(title, msg) {
    var alertPopup = $ionicPopup.alert({
      title: title,
      template: msg
    });
    alertPopup.then(function(res) {});
  }

  var profile = store.get('profile');
  client.get({
    index: 'users',
    type: 'user',
    id: /*profile.user_id,*/ 'google-oauth2|101046949406679467409',
  }, function (error, response) {
    console.log("There was an error in elasticsearch request error : ", error);
    console.log("There was an error in elasticsearch request response : ", response);
    store.set('user',response);
  });
});