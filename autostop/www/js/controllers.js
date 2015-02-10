angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {
  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
})

.controller('FavorisCtrl', function($scope, $stateParams) {
  getAdresses("favSelect");
})

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

  $scope.play = function() {
  	play();
  }

  var profile = store.get('profile');
  client.get({
    index: 'users',
    type: 'user',
    id: /*profile.user_id,*/ '100',
  }, function (error, response) {
    console.log("There was an error in elasticsearch request error : ", error);
    console.log("There was an error in elasticsearch request response : ", response);
    store.set('user',response);
  });
})

.controller('LoginCtrl', function($scope, auth, $state, store, client) {
  auth.signin({
    authParams: {
      // This asks for the refresh token
      // So that the user never has to log in again
      scope: 'openid offline_access',
      // This is the device name
      device: 'Mobile device'
    },
    // Make the widget non closeable
    standalone: true
  }, function(profile, token, accessToken, state, refreshToken) {
          // Login was successful
    // We need to save the information from the login
    store.set('profile', profile);
    store.set('token', token);
    store.set('refreshToken', refreshToken);

    $state.go('app.accueil');

    //TODO
    /*
      Premiere connexion, données à vide ok mais si l'utilisateur se connecte une deuxieme fois ou +, ne pas reinitialiser les données
    */
    client.index({
      index: 'users',
      type: 'user',
      id: profile.user_id,
      body: {
        nom: profile.name,
        mail: profile.email,
        marque: '',
        modele: '',
        couleur: '',
        nbPlaces: 0,
        participationDemandee: 50,
        detour: 3000,
        participationMaximale: 50,
        depose: 2000,
        role: 'visiteur',
        location : {
            lat : 0.0,
            lon : 0.0
        },
        destination : {
            lat : 0.0,
            lon : 0.0
        },
        match: 0
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });
  }, function(error) {
    // Oops something went wrong during login:
    console.log("There was an error logging in", error);
  });
})

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
      id: '100', //profile.user_id
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
      id: '100', //profile.user_id
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
        id: /*profile.user_id,*/ '100',
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
              etat = 3;
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
      id: '100', //profile.user_id
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
      id: '100', //profile.user_id
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
})

.controller('RechercheCtrl', function($scope, $ionicLoading, $ionicNavBarDelegate, $ionicPopup, $compile, $stateParams, $timeout, $interval, $location, store, client) {
  var latitude, longitude, profile, user, conducteur, intervalPromise, matchs, match, etat=0;

  profile = store.get('profile');
  user = store.get('user');
  $scope.hideBackButton = true;
  
  $scope.init = function() {
    console.log("Recherche > Init", "On entre dans la fonction init");
    $scope.showMap = true;
    $scope.printCarInfo = false;
    $scope.getCurrentPosition;
    $scope.setDestination();
    $timeout(function() {
      $scope.checkMatchAutostoppeur();
    }, 1000);
  };

  $scope.getCurrentPosition = function() {
    console.log("Recherche > getCurrentPosition", "On récupère la position de l'autostoppeur");
    navigator.geolocation.getCurrentPosition(function(pos) {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }, function(error) {
      alert('Unable to get location: ' + error.message);
    });
  };

  $scope.updatePosition = function(){
    console.log("Recherche > updatePosition", "On met à jour la position de l'autostoppeur sur le serveur");
    client.update({
      index: 'users',
      type: 'user',
      id: '100', //profile.user_id
      body: {
        doc: {
          role: 'autostoppeur',
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
    console.log("Recherche > setDestination", "On met à jour la destination de l'autostoppeur sur le serveur");
    client.update({
      index: 'users',
      type: 'user',
      id: '100', //profile.user_id
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
        id: /*profile.user_id,*/ '100',
      }, function (error, response) {
        console.log("There was an error in elasticsearch request error : ", error);
        console.log("There was an error in elasticsearch request response : ", response);
        store.set('user',response);
      });
    });
  }

  $scope.getConducteur = function(){
    console.log("Recherche > getConducteur", "On regarde si un utilisateur correspond sur le serveur");
    $scope.loading = $ionicLoading.show({
      showBackdrop: false,
      template: 'Recherche de véhicules en cours...'
    });
    client.search({
      body: {
        query: {
          match_all : {}
        },
        filter: {
          and:[
            {
              script: {
                script: "doc['location'].distance(loc.lat, loc.lon) <= doc['detour'].value",
                params: {
                  "loc" : user._source.location 
                }
              }
            },
            {
              not: {
                terms:{
                  role: ['autostoppeur', 'visiteur'],
                  "_cache" : false
                }
              }
            },
            {
              geo_distance: {
                distance: user._source.depose + 'm',
                destination: {
                  lat: user._source.destination.lat,
                  lon: user._source.destination.lon
                }
              }
            },
            {
              script: {
                script : "part >= doc['participationDemandee'].value",
                params : {
                  "part" : user._source.participationMaximale
                }
              }
            },
            {
              script: {
                script : "doc['nbPlaces'].value > 0"
              }
            }
          ]
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
      $ionicLoading.hide();
      if(response.hits.total > 0){
        if(matchs != null && matchs.total > 0){
          conducteur = null;
          var i=0;
          var proposer = false;
          while(!proposer && i < response.hits.total){
            var j=0;
            var trouver = false;
            while(!trouver && j < matchs.total){
              if((matchs.hits[j]._source.etat == -2) && (matchs.hits[j]._source.conducteur == response.hits.hits[i]._id)){
                trouver = true;
              }
              j++;
            }
            if(!trouver){
              console.log("ligne 656", "On a trouvé un utilisateur valide et on demande si on envoi une demande de prise en charge");
              $interval.cancel(intervalPromise);
              proposer = true;
              conducteur = response.hits.hits[i];
              $scope.conducteur = conducteur;
              var dist = distance(
                conducteur._source.location.lat,
                conducteur._source.location.lon,
                user._source.location.lat,
                user._source.location.lon,
                "M"
              );
              var texte = conducteur._source.nom + " est disponible à " + dist.toFixed(0) + "m, souhaitez-vous envoyer une demande de prise en charge à ce conducteur ?";
              $scope.showConfirm("Véhicule à proximité", texte);
            }
            i++;
          }
          if(!proposer){
            console.log("ligne 665", "On a rien trouver on affiche 'Recherche de véhicules en cours...'");
            $scope.loading = $ionicLoading.show({
              showBackdrop: false,
              template: 'Recherche de véhicules en cours...'
            });
          }
        }
        else{
          console.log("ligne 673", "pas de match (matchs.total == 0)");
          $interval.cancel(intervalPromise);
          conducteur = response.hits.hits[0];
          $scope.conducteur = conducteur;
          var dist = distance(
            conducteur._source.location.lat,
            conducteur._source.location.lon,
            user._source.location.lat,
            user._source.location.lon,
            "M"
          );
          var texte = conducteur._source.nom + " est disponible à " + dist.toFixed(0) + "m, souhaitez-vous envoyer une demande de prise en charge à ce conducteur ?";
          $scope.showConfirm("Véhicule à proximité", texte);
        }
      }
    });
  }

  $scope.getMatchAutostoppeur = function(){
    console.log("Recherche > getMatchAutostoppeur", "On recupère les matchs et on fait l'action associée");
    client.search({
      index: "matchs",
      body: {
        query : {
          match : {
             autostoppeur: user._id
          }
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
      matchs = response.hits;
      if(response.hits.total>0){
        console.log("ligne 698", "Il y a au moins un match pour l'autostoppeur");
        match = response.hits.hits[0];
        for(var i=1; i<response.hits.total; i++){
          if(response.hits.hits[i]._source.etat==1 || response.hits.hits[i]._source.etat==2){
            match = response.hits.hits[i];
          }
        }
        console.log("ligne 705", "Etat du match séléctionné : " + match._source.etat);
        switch(match._source.etat){
          case -2:
            $interval.cancel(intervalPromise);
            $scope.searchConducteur();
            intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
            $scope.loading = $ionicLoading.show({
              showBackdrop: false,
              template: 'Recherche de véhicules en cours...'
            });
            break;
          case -1:
            $interval.cancel(intervalPromise);
            $scope.loading = $ionicLoading.show({
              showBackdrop: false,
              template: "Le conducteur a quitté la session..."
            });
            client.delete({
              index: 'matchs',
              type: 'match',
              id: match._id
            }, function (error, response) {
              console.log("There was an error in elasticsearch request error : ", error);
              console.log("There was an error in elasticsearch request response : ", response);
            });
            etat = 0;
            $timeout(function() {
              $scope.searchConducteur();  
            }, 5000);
            intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
            break;
          case 0:
            break;
          case 1:
            if(etat!=1){
              $interval.cancel(intervalPromise);
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: 'En attente de la réponse du conducteur...'
              });
              $scope.checkMatchAutostoppeur();
              intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
              etat = 1;
            }
            break;
          case 2:
            if(etat != 2){
              $interval.cancel(intervalPromise);
              $scope.printCarInfo = true;
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: "Demande acceptée par le conducteur, véhicule en approche (" + match._source.distance + ")"
              });
              $scope.checkMatchAutostoppeur();
              intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
              etat = 2;
            }
            else{
              if(match._source.distance<1000.00){
                $interval.cancel(intervalPromise);
                $ionicLoading.hide();
                $scope.showConfirmPris("Véhicule tout proche de votre position","Avez-vous été pris en charge par le conducteur ?");
              }
            }
            break;
          case 3:
            $scope.resume();
            break;
          default:
            break;
        }
      }
      else{
        console.log("ligne 770", "Pas de match pour l'autostoppeur");
        $interval.cancel(intervalPromise);
        $scope.searchConducteur();
        intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
        $scope.loading = $ionicLoading.show({
          showBackdrop: false,
          template: 'Recherche de véhicules en cours...'
        });
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
        console.log("Ligne 792", "L'autostoppeur confirme l'envoi d'une demande de prise en charge");
        $interval.cancel(intervalPromise);
        var dist = distance(
          conducteur._source.location.lat,
          conducteur._source.location.lon,
          user._source.location.lat,
          user._source.location.lon,
          "M"
        );

        var distTotal = distance(
          user._source.location.lat,
          user._source.location.lon,
          parseFloat($stateParams.latitude),
          parseFloat($stateParams.longitude),
          "M"
        );

        var match = client.index({
          index: 'matchs',
          type: 'match',
          body: {
            conducteur: conducteur._id,
            autostoppeur: '100', //profile.user_id,
            nom: user._source.nom,
            distance: parseFloat(dist.toFixed(0)),
            distanceTotale: parseFloat(distTotal.toFixed(0)),
            cout: parseFloat((distTotal/1000 * conducteur._source.participationDemandee/100).toFixed(2)),
            etat: 1
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });

        $scope.loading = $ionicLoading.show({
          showBackdrop: false,
          template: 'En attente de la réponse du conducteur...'
        });

        etat = 0;
        intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
      }
      else{
        console.log("Ligne 836", "L'autostoppeur rejette l'envoi d'une demande de prise en charge");
        $interval.cancel(intervalPromise);
        var dist = distance(
          conducteur._source.location.lat,
          conducteur._source.location.lon,
          user._source.location.lat,
          user._source.location.lon,
          "M"
        );

        var distTotal = distance(
          user._source.location.lat,
          user._source.location.lon,
          parseFloat($stateParams.latitude),
          parseFloat($stateParams.longitude),
          "M"
        );
        var match = client.index({
          index: 'matchs',
          type: 'match',
          body: {
            conducteur: conducteur._id,
            autostoppeur: '100', //profile.user_id,
            nom: user._source.nom,
            distance: parseFloat(dist.toFixed(0)),
            distanceTotale: parseFloat(distTotal.toFixed(0)),
            cout: parseFloat((distTotal/1000 * conducteur._source.participationDemandee/100).toFixed(2)),
            etat: -2
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });

        $scope.loading = $ionicLoading.show({
          showBackdrop: false,
          template: 'Recherche de véhicules en cours...'
        });

        etat = 0;
        intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
      }
   });
  }

  $scope.showConfirmPris = function(title, question) {
     var confirmPopup = $ionicPopup.confirm({
       title: title,
       template: question,
       cancelText: 'Non',
       okText: 'Oui',
       okType: 'button-balanced'
    });
    confirmPopup.then(function(res) {
     if(res) {
        $scope.resume();
      }
      else{
        console.log("Ligne 925", "L'autostoppeur dit qu'il n'a pas été pris");
        $scope.loading = $ionicLoading.show({
          showBackdrop: false,
          template: "En attente de l'arrivé du conducteur..."
        });
        $interval.cancel(intervalPromise);
        intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
      }
   });
  }

  $scope.resume = function(){
    console.log("Ligne 976", "L'autostoppeur confirme qu'il a été pris");
    $ionicLoading.hide();
    $scope.showMap = false;
    $ionicNavBarDelegate.showBar(false);

    var dist = distance(
      conducteur._source.location.lat,
      conducteur._source.location.lon,
      user._source.location.lat,
      user._source.location.lon,
      "M"
    );

    client.update({
      index: 'matchs',
      type: 'match',
      id: match._id,
      body: {
        doc: {
          distance: dist,
          etat: 3
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });

    client.search({
      index: "matchs",
      body: {
        query : {
          match : {
             autostoppeur: user._id
          }
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
      matchs = response.hits;
      if(response.hits.total>0){
        console.log("ligne 999", "On va supprimer les matchs en etat -2");
        for(var i=0; i<response.hits.total; i++){
          if(response.hits.hits[i]._source.etat==-2){
            console.log("ligne 1019", response.hits.hits[i]._id + " supprimé")
            client.delete({
              index: 'matchs',
              type: 'match',
              id: response.hits.hits[i]._id
            }, function (error2, response2) {
              console.log("There was an error in elasticsearch request error : ", error2);
              console.log("There was an error in elasticsearch request response : ", response2);
            });
          }
        }
      }
    });

    $interval.cancel(intervalPromise);
    $scope.showMap = false;
    $scope.participationDemandee=conducteur._source.participationDemandee.toFixed(2);
    $scope.distanceTotale=match._source.distanceTotale.toFixed(0);
    $scope.cout=match._source.cout.toFixed(2);
  }

  $scope.terminer = function(){
    console.log("Recherche > exit", "On quitte la navigation");
    $ionicLoading.hide();
    //TODO SI exit Supprimer le match + mise à jour du match à 0

    client.update({
      index: 'users',
      type: 'user',
      id: '100', //profile.user_id
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
          }
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });
    $interval.cancel(intervalPromise);
    $location.path('/');
  };

  $scope.exit = function(){
    console.log("Recherche > exit", "On quitte la navigation");
    //TODO SI exit Supprimer le match + mise à jour du match à 0
    console.log("match", JSON.stringify(match));
    $ionicLoading.hide();
    client.update({
      index: 'users',
      type: 'user',
      id: '100', //profile.user_id
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
          }
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });
    if(match != null){
      if(match._source.etat == -1){
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
              etat: 0
            }
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });
      }
    }
    $interval.cancel(intervalPromise);
    $location.path('/');
  };

  $scope.searchConducteur = function() {
    console.log("Recherche > searchConducteur", "On cherche un conducteur");
    $scope.getCurrentPosition();
    $scope.updatePosition();
    $scope.getConducteur();
  };

  $scope.checkMatchAutostoppeur = function() {
    console.log("Recherche > checkMatchAutostoppeur", "On check les matchs de l'autostoppeur");
    $scope.getCurrentPosition();
    $scope.updatePosition();
    $scope.getMatchAutostoppeur();
  };
})

.controller('ProfilCtrl', function($scope, $stateParams, $ionicPopup, store, client) {
  $scope.user = store.get('user')._source;
  $scope.profile = store.get('profile');
  $scope.printConductor = true;

  $scope.printOther = function(){
    $scope.printConductor = !$scope.printConductor;
  }

  $scope.update = function(user, profile){
    client.index({
      index: 'users',
      type: 'user',
      id: /*profile.user_id*/ '100',
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

  $scope.showAlert = function() {
    var alertPopup = $ionicPopup.alert({
      title: 'Configuration Sauvegardé',
      template: 'Votre nouvelle configuration a été sauvegardé'
    });
    alertPopup.then(function(res) {});
  }
})

.controller('PopupCtrl', function($scope, $ionicPopup, $timeout) {
   // A confirm dialog
   $scope.showConfirm = function(title, question) {
     var confirmPopup = $ionicPopup.confirm({
       title: title,
       template: question
     });
     confirmPopup.then(function(res) {
       if(res) {
         console.log('You are sure');
       } else {
         console.log('You are not sure');
       }
     });
   };

   // An alert dialog
   $scope.showAlert = function(title, msg) {
     var alertPopup = $ionicPopup.alert({
       title: title,
       template: msg
     });
     /*
     alertPopup.then(function(res) {
       console.log('Thank you for not eating my delicious ice cream cone');
     });
     */
   };


});
