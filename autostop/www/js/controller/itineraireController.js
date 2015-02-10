angular.module('ItineraireController', [])
  .controller('ItineraireCtrl', function($scope, $ionicLoading, $ionicNavBarDelegate, $ionicPopup, $compile, $stateParams, $interval, $location, $timeout, store, client) {
    var latitude, longitude, profile, user, intervalPromise, match, autostoppeur, dist, etat=0;
    
    $scope.showMap = true;
    $scope.hideBackButton = true;
    $scope.directionsService;
    $scope.directionsService = new google.maps.DirectionsService();

    // Recuperation du profil et des données de l'utilisateur 
    profile = store.get('profile');
    user = store.get('user');

    // Fonction appelée lors du chargement de la vue
    $scope.init = function() {
      console.log("itineraireController", "getCurrentPosition");
      $scope.directionsDisplay = new google.maps.DirectionsRenderer();
      var myLatlng = new google.maps.LatLng(48.858859,2.3470599);

      var mapOptions = {
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        panControl: false,
        maxZoom: 18,
        minZoom: 5
      };
      var map = new google.maps.Map(document.getElementById("map"), mapOptions);

      $scope.loading = $ionicLoading.show({
        showBackdrop: false,
        template: "Démarrage de l'itineraire..."
      });
      $scope.button=1;
      $scope.map = map;
      $scope.directionsDisplay.setMap(map);
      $scope.setDestination(); // Mise à jour de la destination
      $scope.calcRoute($stateParams.latitude, $stateParams.longitude); // Calcul de l'itineraire
      $scope.updateLocation(); // Mise à jour de la localisation du conducteur
      $timeout(function() {
        $scope.getMatchConducteur(); // Check si un match du conducteur
      }, 1000);
      $ionicLoading.hide();
    };

    // Fonction appelée pour mettre a jour la location du conducteur dans elasticsearch
    $scope.updateLocation = function(){
      console.log("update","update");
      // Requete elasticsearch mettant à jour la localisation et le role de l'utilisateur
      client.update({
        index: 'users',
        type: 'user',
        id: 'google-oauth2|101046949406679467409', //profile.user_id
        body: {
          doc: {
            role: 'conducteur',
            location : {
              lat : latitude,
              lon : longitude
            }
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
      });
    };

    // Fonction appelée pour tracer l'itineraire de la position du conducteur jusqu'à un endroit précis
    $scope.calcRoute = function(lat, lng) {
      console.log("getCurrentPosition","getCurrentPosition");
      if(!$scope.map) {
        return;
      }

      navigator.geolocation.getCurrentPosition(function(pos) {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        $scope.map.setCenter(new google.maps.LatLng(latitude, longitude));

        var start = "" + latitude + ", " + longitude + "";
        var end = "" + lat + ", " + lng + "";
        var request = {
          origin:start,
          destination:end,
          travelMode: google.maps.TravelMode.DRIVING
        };
        $scope.directionsService.route(request, function(result, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            $scope.directionsDisplay.setDirections(result);
            $scope.map.zoom = 5;
            $ionicLoading.hide();
          }
        });
      }, function(error) {
        console.log('Unable to get location', error.message);
      });
    };

    // Fonction qui trace l'itineraire de la position du conducteur jusqu'à sa destination finale
    $scope.reloadItineraireClassique = function() {
      console.log("reloadItineraireClassique","reloadItineraireClassique");
      $scope.calcRoute($stateParams.latitude, $stateParams.longitude);
      $scope.updateLocation(); 
      $scope.getMatchConducteur();
    };

    // Fonction qui trace l'itineraire de la position du conducteur jusqu'à un autostoppeur
    $scope.reloadItineraireDetour = function() {
      console.log("reloadItineraireDetour","reloadItineraireDetour");
      $scope.calcRoute(autostoppeur._source.location.lat, autostoppeur._source.location.lon); 
      $scope.updateLocation(); 
      $scope.getMatchConducteur();
    }

    // Fonction appelée pour mettre a jour la destination du conducteur
    $scope.setDestination = function(){
      console.log("setDestination","setDestination");
      // Requete elasticsearch mettant à jour la destination de l'utilisateur
      client.update({
        index: 'users',
        type: 'user',
        id: 'google-oauth2|101046949406679467409', //profile.user_id
        body: {
          doc: {
            destination : {
              lat : parseFloat($stateParams.latitude),
              lon : parseFloat($stateParams.longitude)
            }
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);

        // Requete elasticsearch recuperant les données de l'utilisateur
        client.get({
          index: 'users',
          type: 'user',
          id: /*profile.user_id,*/ 'google-oauth2|101046949406679467409',
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
          // Sauvegarde des données de l'utilisateur
          store.set('user',response);
        });
      });
    }

    // Fonction appelée pour rechercher les matchs du conducteur
    $scope.getMatchConducteur = function(){
      console.log("getMatchConducteur","getMatchConducteur");
      // Requete elasticsearch cherchant les matchs du conducteur via son identifiant
      client.search({
        index: "matchs",
        body: {
          query : {
            match : {
               conducteur: user._id
            }
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
        // Si il existe un match ayant ce conducteur
        if(response.hits.total>0){
          // On stock le match en cours
          match = response.hits.hits[0];
          for(var i=1; i<response.hits.total; i++){
            if(response.hits.hits[i]._source.etat==1 || response.hits.hits[i]._source.etat==2){
              match = response.hits.hits[i];
            }  
          }
          // Selon l'état de ce match
          switch(match._source.etat){
            // Cas si l'autostoppeur a quitté la prise en charge
            case 0:
              console.log("case 0"," case 0");
              $scope.button = 1;
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: "L'autostoppeur a quitté la session..."
              });
              // Requete elasticsearch supprimant ce match 
              client.delete({
                index: 'matchs',
                type: 'match',
                id: match._id
              }, function (error2, response2) {
                console.log("There was an error in elasticsearch request error : ", error2);
                console.log("There was an error in elasticsearch request response : ", response2);
              });
              etat = 0;
              $interval.cancel(intervalPromise);
              // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
              $timeout(function() {
                $scope.reloadItineraireClassique();
               }, 5000);
              intervalPromise = $interval(function(){ 
                $scope.reloadItineraireClassique(); }, 
              25000);
              break;
            // Cas lorsqu'un autostoppeur demande à se faire prendre en charge par ce conducteur
            case 1:
              console.log(" case 1"," case 1");
              if(etat != 1){
                $scope.getAutostoppeur();
                $interval.cancel(intervalPromise);
                $scope.showConfirm("Auto-stoppeur à proximité", match._source.nom + " recherche un véhicule. Cet auto-stoppeur se trouve à " + match._source.distance + "m de votre position. Souhaitez-vous le prendre en charge ?");
                play("prendreAutoStoppeur.mp3");
                etat = 1;
              }
              break;
            // Cas lorsqu'un conducteur est en train de se diriger vers l'autostoppeur
            case 2:
              console.log(" case 2"," case 2");
              $scope.getAutostoppeur();
              
              $timeout(function() {
                $scope.button = 2;
                dist = distance(
                  user._source.location.lat,
                  user._source.location.lon,
                  autostoppeur._source.location.lat,
                  autostoppeur._source.location.lon,
                  "M"
                );
                // Si la distance est inférieur à 200m entre le conducteur et l'autopstoppeur
                if(dist < 200.00){
                  $scope.button = 3;
                }
              }, 5000);

              etat = 2;
              break;
            // Cas lorsque l'autostoppeur et le conducteur se sont trouvés, le conducteur se dirige actuellement vers sa destination  
            case 3:
              console.log("case 3","case 3");

              if(etat != 3){
                $scope.button=1;
                $interval.cancel(intervalPromise);
                // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
                $scope.reloadItineraireClassique();
                intervalPromise = $interval(function(){ 
                  $scope.reloadItineraireClassique(); 
                }, 25000);

                etat = 3;

                play("newItineraire.mp3");
              }
              else{
                dist = distance(
                  user._source.location.lat,
                  user._source.location.lon,
                  parseFloat($stateParams.latitude),
                  parseFloat($stateParams.longitude),
                  "M"
                );
                // Si la distance est inférieur à 200m entre le conducteur et sa destination
                if(dist < 200.00){
                  $interval.cancel(intervalPromise);
                  // On enleve la map et affiche un récapitulatif au conducteur
                  $ionicNavBarDelegate.showBar(false);
                  $scope.showMap = false;
                  $scope.participationDemandee=user._source.participationDemandee.toFixed(2);
                  var matchsAutostoppeur = [];
                  for(var i=0; i<response.hits.total; i++){
                    if(response.hits.hits[i]._source.etat==3){
                      matchsAutostoppeur.push(response.hits.hits[i]._source);
                    }  
                  }
                  // On envoi les données à la vue
                  $scope.matchsAutostoppeur=matchsAutostoppeur;

                  // Requete elasticsearch supprimant les matchs du conducteur
                  client.delete({
                    index: 'matchs',
                    type: 'match',
                    id: match._id
                  }, function (error, response) {
                    console.log("There was an error in elasticsearch request error : ", error);
                    console.log("There was an error in elasticsearch request response : ", response);
                  });
                }
              }
              break;
            default:
              break;
          }
        } 
        else{
          // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
          $interval.cancel(intervalPromise);
          intervalPromise = $interval(function(){ 
            $scope.reloadItineraireClassique(); 
          }, 25000);
        } 
      });
    }

    // Fonction appelée pour récupérer les données d'un autostoppeur par son identifiant
    $scope.getAutostoppeur = function(){
      console.log("getAutostoppeur","getAutostoppeur");
      // Requete elasticsearch recherchant un autostoppeur ayant matché avec le conducteur
      client.search({
        index: "users",
        q: "_id:"+match._source.autostoppeur
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
        autostoppeur = "";
        // Si les données de l'autostoppeur ont été récupérées, on les sauvegarde
        if(response.hits.total>0){
          autostoppeur = response.hits.hits[0];
        }  
      });
    }

    // Fonction appelée lorsqu'un autostoppeur est à proximité
    $scope.showConfirm = function(title, question) {
      // Boite de dialogue demandant au conducteur si il souhaite prendre l'autostoppeur
      var confirmPopup = $ionicPopup.confirm({
        title: title,
        template: question,
        cancelText: 'Non',
        okText: 'Oui',
        okType: 'button-balanced'
      });

      confirmPopup.then(function(res) {
        // Si le conducteur confirme la prise en charge
        if(res) {
          // Requete elasticsearch mettant à jour l'état du match > etat 2 
          client.update({
            index: 'matchs',
            type: 'match',
            id: match._id,
            body: {
              doc: {
                etat: 2
              }  
            }
          }, function (error, response) {
            console.log("There was an error in elasticsearch request error : ", error);
            console.log("There was an error in elasticsearch request response : ", response);
          });

          $scope.button = 2;

          $scope.loading = $ionicLoading.show({
            showBackdrop: false,
            template: "Recalcul de l'itineraire..."
          });
          
          etat = 1;
          $interval.cancel(intervalPromise);

          // Calcul de l'itineraire pour aller chercher l'autostoppeur
          $timeout(function() {
            $scope.reloadItineraireDetour();
          }, 5000);          
          intervalPromise = $interval(function(){ $scope.reloadItineraireDetour();}, 25000);
        }
        else{
          // Si le conducteur ne souhaite pas prendre l'autostoppeur
          // Requete elasticsearch mettant à jour l'état du match > etat -2 
          client.update({
            index: 'matchs',
            type: 'match',
            id: match._id,
            body: {
              doc: {
                etat: -2
              }
            }
          }, function (error, response) {
            console.log("There was an error in elasticsearch request error : ", error);
            console.log("There was an error in elasticsearch request response : ", response);
          });

          etat = 0;
          $interval.cancel(intervalPromise);

          // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
          $timeout(function() {
            $scope.reloadItineraireClassique();
          }, 5000);
          intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
        }
     });
    }

    // Fonction appelée lorsque le conducteur clique sur le bouton 'Quitter la navigation'
    $scope.exit = function(){
      $ionicLoading.hide();
      $interval.cancel(intervalPromise);

      // Requete elasticsearch mettant à jour le role, la location et la destination du conducteur
      client.update({
        index: 'users',
        type: 'user',
        id: 'google-oauth2|101046949406679467409', //profile.user_id
        body: {
          doc: {
            role: 'visiteur',
            location : {
              lat: 0.0,
              lon: 0.0
            },
            destination : {
              lat: 0.0,
              lon: 0.0
            },
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
      });

      // Si un match en cours ayant ce conducteur
      if(match != null){
        if(match._source.etat == 0){
          // Requete elasticsearch supprimant le match
          client.delete({
            index: 'matchs',
            type: 'match',
            id: match._id
          }, function (error, response) {
            console.log("There was an error in elasticsearch request error : ", error);
            console.log("There was an error in elasticsearch request response : ", response);
          });
        }
        else{
          // Requete elasticsearch mettant à jour l'état du match > etat -1
          client.update({
            index: 'matchs',
            type: 'match',
            id: match._id,
            body: {
              doc: {
                etat: -1
              }
            }
          }, function (error, response) {
            console.log("There was an error in elasticsearch request error : ", error);
            console.log("There was an error in elasticsearch request response : ", response);
          });
        }
      }
      $location.path('/');
    };

    // Fonction appelée lorsque le conducteur a atteint sa destination finale et click sur le bouton 'Continuer'
    $scope.terminer = function(){
      $ionicLoading.hide();
      $interval.cancel(intervalPromise);

      // Requete elasticsearch mettant à jour le role, la location et la destination du conducteur
      client.update({
        index: 'users',
        type: 'user',
        id: 'google-oauth2|101046949406679467409', //profile.user_id
        body: {
          doc: {
            role: 'visiteur',
            location : {
              lat: 0.0,
              lon: 0.0
            },
            destination : {
              lat: 0.0,
              lon: 0.0
            },
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
      });
      $location.path('/');
    };

    // Fonction appelée lorsque le conducteur a atteint sa destination finale et click sur le bouton 'Continuer'
    $scope.annuler = function(){
      $interval.cancel(intervalPromise);
      $scope.button=1;

      // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
      $timeout(function() {
        $scope.reloadItineraireClassique();
      }, 5000);  
      intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);

      // Requete elasticsearch mettant à jour l'etat du match en cours > etat : -1 
      client.update({
        index: 'matchs',
        type: 'match',
        id: match._id,
        body: {
          doc: {
            etat: -1
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
      });  
    };

    // Fonction appelée lorsque le conducteur annule la prise en charge en un click sur le bouton 'Annuler la prise en charge'
    $scope.reprise = function(){
      $interval.cancel(intervalPromise);
      $scope.button=1;

      $scope.loading = $ionicLoading.show({
        showBackdrop: false,
        template: "Recalcul de l'itineraire..."
      });

      // Calcul de l'itineraire pour guider le conducteur jusqu'à sa destination
      $timeout(function() {
        $scope.reloadItineraireClassique();
      }, 5000);  
      intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);

      // Requete elasticsearch mettant à jour l'etat du match en cours > etat : 3
      client.update({
        index: 'matchs',
        type: 'match',
        id: match._id,
        body: {
          doc: {
            etat: 3
          }
        }
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
      });
    };
  });