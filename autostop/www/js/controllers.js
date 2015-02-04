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
  var latitude, longitude, profile, user, intervalPromise, match, autostoppeur, etat=0;
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
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map"), mapOptions);

    $scope.loading = $ionicLoading.show({
      showBackdrop: false,
      template: "Démarrage de l'itineraire..."
    });

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
      $ionicLoading.hide();

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
        $ionicLoading.hide();
        match = response.hits.hits[0];
        for(var i=1; i<response.hits.total; i++){
          if(response.hits.hits[i].etat==1 || response.hits.hits[i].etat==2){
            match = response.hits.hits[i];
          }  
        }
        switch(match._source.etat){
          case 0:
            console.log(" case 0"," case 0");
            $scope.loading = $ionicLoading.show({
              showBackdrop: false,
              template: "Erreur lors de la prise en charge..."
            });
            client.delete({
              index: 'matchs',
              type: 'match',
              id: match._id
            }, function (error2, response2) {
              console.log("There was an error in elasticsearch request error : ", error2);
              console.log("There was an error in elasticsearch request response : ", response2);
            });
            $interval.cancel(intervalPromise);
            $scope.reloadItineraireClassique();
            intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
            break;
          case 1:
            console.log(" case 1"," case 1");
            if(etat != 1){
              $scope.getAutostoppeur();
              $interval.cancel(intervalPromise);
              $scope.showConfirm("Un auto-stoppeur a été trouvé se trouvant à " + match._source.distance + "m de votre position. Souhaitez-vous le prendre en charge ?");
              etat = 1;
            }
            break;
          case 2:
            console.log(" case 2"," case 2");
            $scope.getAutostoppeur();
            etat = 2;
            break;
            
          case 3:
            console.log("case 3","case 3");
            // Poursuite du trajet calcul du nouveau itineraire + enlever une place
            // Demande si l'autostoppeur a ete pris en charge SI OUI
            // Poursuite du trajet calcul du nouveau itineraire + enlever une place + supprimer match
            // Sinon on recherche de nouveau l'itineraire jusqu'au conducteur

            $scope.showMap = false;
            $ionicNavBarDelegate.showBar(false);

            if(etat != 3){
              $interval.cancel(intervalPromise);
              $scope.reloadItineraireClassique();
              intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
              etat = 3;
            }
            else{
              var dist = distance(
                user._source.location.lat,
                user._source.location.lon,
                parseFloat($stateParams.latitude),
                parseFloat($stateParams.longitude),
                "M"
              );

              if(dist<500.00){
                $scope.showMap = false;
                $interval.cancel(intervalPromise);
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
                  //id: match._id
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

        $scope.loading = $ionicLoading.show({
          showBackdrop: false,
          template: "Recalcul de l'itineraire..."
        });
        
        $interval.cancel(intervalPromise);
        $scope.reloadItineraireDetour();
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
        $scope.reloadItineraireClassique();
        intervalPromise = $interval(function(){ $scope.reloadItineraireClassique(); }, 25000);
      }
   });
  }

  $scope.exit = function(){
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
          match: 0
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });
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
    $location.path('/');
  };

  // MAUVAIS LE RELOAD? IL RECHARGE LE CALCITINERAIRE MAIS SI ON EST EN TRAIN DE CHERCHER UN AUTO STOPPEUR ON VA PERDRE NOTRE ITINERAIRE 
  //intervalPromise = $interval(function(){ $scope.reload(); }, 100000);
})

.controller('RechercheCtrl', function($scope, $ionicLoading, $ionicPopup, $compile, $stateParams, $interval, $location, store, client) {
  var latitude, longitude, profile, user, conducteur, intervalPromise, match, etat=0;

  profile = store.get('profile');
  user = store.get('user');
  $scope.hideBackButton = true;
  
  $scope.init = function() {
    $scope.showMap = true;
    $scope.setDestination();
    $interval.cancel(intervalPromise);
    $scope.searchConducteur();
    intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
  };

  $scope.getCurrentPosition = function() {
    navigator.geolocation.getCurrentPosition(function(pos) {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }, function(error) {
      alert('Unable to get location: ' + error.message);
    });
  };

  $scope.updatePosition = function(){
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
                term:{
                  role: 'autostoppeur',
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
      if(response.hits.total>0){
        $interval.cancel(intervalPromise);
        $ionicLoading.hide();
        conducteur = response.hits.hits[0];
        
        $scope.showConfirm("Véhicule à proximité","Souhaitez-vous envoyer une demande de prise en charge à ce conducteur ?");
        play();
      }  
    });
  }

  $scope.getMatchAutostoppeur = function(){
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
      if(response.hits.total>0){
        match = response.hits.hits[0];
        for(var i=1; i<response.hits.total; i++){
          if(response.hits.hits[i].etat==1 || response.hits.hits[i].etat==2){
            match = response.hits.hits[i];
          }  
        }
        switch(match._source.etat){
          case -1:
            break;
          case 0:
            $scope.loading = $ionicLoading.show({
              showBackdrop: false,
              template: "Erreur lors de la prise en charge..."
            });
            client.delete({
              index: 'matchs',
              type: 'match',
              id: match._id
            }, function (error, response) {
              console.log("There was an error in elasticsearch request error : ", error);
              console.log("There was an error in elasticsearch request response : ", response);
            });
            $interval.cancel(intervalPromise);
            $scope.searchConducteur();  
            intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
            break;
          case 1:
            if(etat!=1){
              $interval.cancel(intervalPromise);
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: 'En attente de la réponse du conducteur...'
              });
              etat = 1;
            }
            break;
          case 2:
            if(etat != 2){
              $interval.cancel(intervalPromise);
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
          default:
            break;
        }
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
            distance: dist.toFixed(0),
            distanceTotale: distTotal.toFixed(0),
            cout: (distTotal/1000 * conducteur._source.participationDemandee/100).toFixed(2),
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
        $interval.cancel(intervalPromise);
        $scope.checkMatchAutostoppeur();
        intervalPromise = $interval(function(){ $scope.checkMatchAutostoppeur(); }, 25000);
      }
      else{
        $interval.cancel(intervalPromise);
        client.update({
          index: 'matchs',
          type: 'match',
          id: match._id,
          body: {
            doc: {
              distance: dist,
              etat: -2
            }
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });
        $scope.searchConducteur();
        intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
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

        $interval.cancel(intervalPromise);
        $scope.showMap = false;
        $scope.participationDemandee=conducteur._source.participationDemandee.toFixed(2);
        $scope.distanceTotale=match._source.distanceTotale.toFixed(0);
        $scope.cout=match._source.cout.toFixed(2);
      }
   });
  }

  $scope.exit = function(){
    console.log("exit","exit");
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
    if(match != null){
      client.update({
          index: 'matchs',
          type: 'match',
          id: match._id,
          body: {
            doc: {
              distance: dist,
              etat: 0
            }
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });
    }
    $interval.cancel(intervalPromise);
    $location.path('/');
  };

  $scope.searchConducteur = function() {
    $scope.getCurrentPosition();
    $scope.updatePosition();
    $scope.getConducteur();
  };

  $scope.checkMatchAutostoppeur = function() {
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
