angular.module('ItineraireController', [])
  .controller('ItineraireCtrl', function($scope, $ionicLoading, $ionicNavBarDelegate, $ionicPopup, $compile, $stateParams, $interval, $location, $timeout, store, client) {
    var latitude, longitude, profile, user, intervalPromise, match, autostoppeur, dist, etat=0;
    $scope.showMap = true;
    $scope.hideBackButton = true;
    $scope.directionsService;
    $scope.directionsService = new google.maps.DirectionsService();

    profile = store.get('profile');
    user = store.get('user');

    $scope.init = function() {
      console.log("init","init");
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
      $scope.setDestination();
      $scope.calcRoute($stateParams.latitude, $stateParams.longitude);
      $scope.updateLocation();
      $scope.getMatchConducteur();
      $ionicLoading.hide();
    };

    $scope.calcRoute = function(lat, lng) {
      console.log("getCurrentPosition","getCurrentPosition");
      if(!$scope.map) {
        return;
      }

      navigator.geolocation.getCurrentPosition(function(pos) {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        $scope.map.setCenter(new google.maps.LatLng(latitude, longitude));


        console.log("calcRoute","calcRoute");
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
        alert('Unable to get location: ' + error.message);
      });
    };

    $scope.reloadItineraireClassique = function() {
      console.log("reloadItineraireClassique","reloadItineraireClassique");
      $scope.calcRoute($stateParams.latitude, $stateParams.longitude);
      $scope.updateLocation(); 
      $scope.getMatchConducteur();
    };

    $scope.reloadItineraireDetour = function() {
      console.log("reloadItineraireDetour","reloadItineraireDetour");
      $scope.calcRoute(autostoppeur._source.location.lat, autostoppeur._source.location.lon); 
      $scope.updateLocation(); 
      $scope.getMatchConducteur();
    }

    $scope.updateLocation = function(){
      console.log("update","update");
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

    $scope.setDestination = function(){
      console.log("setDestination","setDestination");
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
        client.get({
          index: 'users',
          type: 'user',
          id: /*profile.user_id,*/ 'google-oauth2|101046949406679467409',
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
          store.set('user',response);
        });
        /*user.destination.lat = parseFloat($stateParams.latitude);
        user.destination.lon = parseFloat($stateParams.longitude);
        store.set("user",user);*/
      });
    }

    $scope.getMatchConducteur = function(){
      console.log("getMatchConducteur","getMatchConducteur");
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
        if(response.hits.total>0){
          match = response.hits.hits[0];
          for(var i=1; i<response.hits.total; i++){
            if(response.hits.hits[i]._source.etat==1 || response.hits.hits[i]._source.etat==2){
              match = response.hits.hits[i];
            }  
          }
          switch(match._source.etat){
            case 0:
              $scope.button = 1;
              console.log(" case 0"," case 0");
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: "L'autostoppeur a quitté la session..."
              });
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
              $timeout(function() {
                $scope.reloadItineraireClassique();
               }, 5000);
              intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
              break;
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

                if(dist < 1000.00){
                  $scope.button = 3;
                }
              }, 5000);

              etat = 2;
              break;    
            case 3:
              console.log("case 3","case 3");
              // Poursuite du trajet calcul du nouveau itineraire + enlever une place
              // Demande si l'autostoppeur a ete pris en charge SI OUI
              // Poursuite du trajet calcul du nouveau itineraire + enlever une place + supprimer match
              // Sinon on recherche de nouveau l'itineraire jusqu'au conducteur
              if(etat != 3){
                $scope.button=1;
                $interval.cancel(intervalPromise);
                $scope.reloadItineraireClassique();
                intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
                etat = 3
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
                if(dist < 500.00){
                  $interval.cancel(intervalPromise);
                  $ionicNavBarDelegate.showBar(false);
                  $scope.showMap = false;
                  $scope.participationDemandee=user._source.participationDemandee.toFixed(2);
                  var matchsAutostoppeur = [];
                  for(var i=0; i<response.hits.total; i++){
                    if(response.hits.hits[i]._source.etat==3){
                      matchsAutostoppeur.push(response.hits.hits[i]._source);
                    }  
                  }
                  $scope.matchsAutostoppeur=matchsAutostoppeur;

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
          $interval.cancel(intervalPromise);
          intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
        } 
      });
    }

    $scope.getAutostoppeur = function(){
      console.log("getAutostoppeur","getAutostoppeur");
      client.search({
        index: "users",
        q: "_id:"+match._source.autostoppeur
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
        autostoppeur = "";
        if(response.hits.total>0){
          autostoppeur = response.hits.hits[0];
        }  
      });
    }

    $scope.showConfirm = function(title, question) {
      var confirmPopup = $ionicPopup.confirm({
        title: title,
        template: question,
        cancelText: 'Non',
        okText: 'Oui',
        okType: 'button-balanced'
      });
      confirmPopup.then(function(res) {
      if(res) {
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
          $timeout(function() {
            $scope.reloadItineraireDetour();
          }, 5000);          
          intervalPromise = $interval(function(){ $scope.reloadItineraireDetour();}, 25000);
        }
        else{
          $interval.cancel(intervalPromise);
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
          $timeout(function() {
            $scope.reloadItineraireClassique();
          }, 5000);
          intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
        }
     });
    }

    $scope.exit = function(){
      $ionicLoading.hide();
      $interval.cancel(intervalPromise);
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
      if(match._source.etat == 0){
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
      $location.path('/');
    };

    $scope.terminer = function(){
      $ionicLoading.hide();
      $interval.cancel(intervalPromise);
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


    $scope.annuler = function(){
      $interval.cancel(intervalPromise);

      $scope.button=1;
      $timeout(function() {
        $scope.reloadItineraireClassique();
      }, 5000);  
      intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);

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

    $scope.reprise = function(){
      $interval.cancel(intervalPromise);

      $scope.loading = $ionicLoading.show({
        showBackdrop: false,
        template: "Recalcul de l'itineraire..."
      });

      $scope.button=1;
      $timeout(function() {
        $scope.reloadItineraireClassique();
      }, 5000);  
      intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);

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

    // MAUVAIS LE RELOAD? IL RECHARGE LE CALCITINERAIRE MAIS SI ON EST EN TRAIN DE CHERCHER UN AUTO STOPPEUR ON VA PERDRE NOTRE ITINERAIRE 
    //intervalPromise = $interval(function(){ $scope.reload(); }, 100000);
  });