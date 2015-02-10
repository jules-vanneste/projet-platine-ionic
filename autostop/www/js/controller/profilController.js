angular.module('ProfilController', [])
  .controller('ProfilCtrl', function($scope, $stateParams, $ionicPopup, store, client) {
    // Recuperation du profil et des données de l'utilisateur
    $scope.user = store.get('user')._source;
    $scope.profile = store.get('profile');

    $scope.printConductor = true;

    $scope.printOther = function(){
      $scope.printConductor = !$scope.printConductor;
    }

    // Mise à jour des données l'utilisateur
    $scope.update = function(user, profile){
      client.index({
        index: 'users',
        type: 'user',
        id: /*profile.user_id*/ 'google-oauth2|101046949406679467409',
        body: {
          nom: user.nom,
          mail: /*profile.email,*/ "jules.vanneste@gmail.com",
          marque: user.marque,
          modele: user.modele,
          couleur: user.couleur,
          nbPlaces: user.nbPlaces,
          participationDemandee: parseInt(user.participationDemandee),
          detour: parseInt(user.detour),
          participationMaximale: parseInt(user.participationMaximale),
          depose: parseInt(user.depose),
          role: 'visiteur',
          location : {
              lat : 0.0,
              lon : 0.0
          },
          destination : {
              lat : 0.0,
              lon : 0.0
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
        store.set('user',response);
        $scope.showAlert();
      });
    }

    // Boite d'information s'affichant suite à l'enregistrement des données de l'utilisateur
    $scope.showAlert = function() {
      var alertPopup = $ionicPopup.alert({
        title: 'Configuration Sauvegardé',
        template: 'Votre nouvelle configuration a été sauvegardé'
      });
      alertPopup.then(function(res) {});
    }
  });