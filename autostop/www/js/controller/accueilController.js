angular.module('AccueilController', [])
.controller('AccueilCtrl', function($scope, $stateParams, $ionicPopup, client, store) {
  $scope.hideBackButton = true;
  ouvertureBDDandGetAdresses();

  // Sauvegarde du profil : données issues du service d'authentification OAuth
  var profile = store.get('profile');
  
  client.get({
    index: 'users',
    type: 'user',
    id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
  }, function (error, response) {
    console.log("There was an error in elasticsearch request error : ", error);
    console.log("There was an error in elasticsearch request response : ", response);
    store.set('user',response);
  });

  // Sauvegarde d'une destination lors du click de l'utilisateur sur le bouton 'Enregistrer votre Destination'
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

  // Boite d'information s'affichant suite à la tentative d'enregistrement de la destination
  $scope.showAlert = function(title, msg) {
    var alertPopup = $ionicPopup.alert({
      title: title,
      template: msg
    });
    alertPopup.then(function(res) {});
  }
});