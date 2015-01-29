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
  getAdresses();
})

.controller('AccueilCtrl', function($scope, $stateParams, client, store) {
  $scope.hideBackButton = true;
  ouvertureBDD();
  play();
  $scope.saveAdresse = function(adresse) {
    console.log('saveAdresse called');
    addData(adresse);
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

.controller('ItineraireCtrl', function($scope, $ionicLoading, $compile, $stateParams, $interval, $location, store, client) {
  var latitude, longitude, profile, user, intervalPromise;
  $scope.directionsService;
  $scope.directionsService = new google.maps.DirectionsService();

  profile = store.get('profile');
  user = store.get('user');

  $scope.init = function() {
    $scope.directionsDisplay = new google.maps.DirectionsRenderer();
    var myLatlng = new google.maps.LatLng(48.858859,2.3470599);

    var mapOptions = {
      center: myLatlng,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map"), mapOptions);

    $scope.map = map;
    $scope.directionsDisplay.setMap(map);
    $scope.setDestination();
    $scope.getCurrentPosition();
  };

  $scope.getCurrentPosition = function() {
    if(!$scope.map) {
      return;
    }

    $scope.loading = $ionicLoading.show({
      content: 'Getting current location...',
      showBackdrop: false
    });

    navigator.geolocation.getCurrentPosition(function(pos) {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      $scope.map.setCenter(new google.maps.LatLng(latitude, longitude));
      $ionicLoading.hide();
      $scope.calcRoute();
      $scope.update();
    }, function(error) {
      alert('Unable to get location: ' + error.message);
    });
  };

  $scope.calcRoute = function() {
    var start = "" + latitude + ", " + longitude + "";
    var end = "" + $stateParams.latitude + ", " + $stateParams.longitude + "";
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
  };

  $scope.reload = function() {
    $scope.getCurrentPosition();
    $scope.calcRoute();
  };

  $scope.update = function(){
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
    $scope.getAutostoppeur();
  };

  $scope.setDestination = function(){
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

  $scope.getAutostoppeur = function(){
    client.search({
      body: {
        query: {
          match_all : {}
        },
        filter: {
          and:[
            {
              geo_distance: {
                distance: user._source.detour + 'm',
                location: {
                  lat: latitude,
                  lon: longitude
                }
              }
            },
            {
              not: {
                term:{
                  role: 'conducteur',
                  "_cache" : false
                }
              }
            },
            {
              script: {
                script : "doc['destination'].distance(dest.lat, dest.lon) <= doc['depose'].value",
                params : {
                  "dest" : user._source.destination
                }
              }
            },
            {
              script: {
                script : "part <= doc['participationMaximale'].value",
                params : {
                  "part" : user._source.participationDemandee
                }
              }
            },
            {
              script: {
                script : "nbPlaces > 0",
                params : {
                  "nbPlaces" : user._source.nbPlaces
                }
              }
            }
          ]
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
      var autostoppeur = "";
      if(response.hits.total>0){
        autostoppeur = response.hits.hits[0];
        alert("Un autostoppeur est dispo : " + autostoppeur._source.nom);
      }  
    });
  }

  $scope.exit = function(){
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
          match: 0
        }
      }
    }, function (error, response) {
      console.log("There was an error in elasticsearch request error : ", error);
      console.log("There was an error in elasticsearch request response : ", response);
    });
    $interval.cancel(intervalPromise);
    $location.path('/');
  };

  intervalPromise = $interval(function(){ $scope.reload(); }, 100000);
})

.controller('RechercheCtrl', function($scope, $ionicLoading, $ionicPopup, $compile, $stateParams, $interval, $location, store, client) {
  var latitude, longitude, profile, user, conducteur, intervalPromise, match;

  profile = store.get('profile');
  user = store.get('user');

  $scope.init = function() {
    $scope.setDestination();
    $scope.searchConducteur();
  };

  $scope.getCurrentPosition = function() {
    navigator.geolocation.getCurrentPosition(function(pos) {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
 //     $ionicLoading.hide();
    }, function(error) {
      alert('Unable to get location: ' + error.message);
    });
  };

  $scope.updatePosition = function(){
    client.update({
      index: 'users',
      type: 'user',
      id: 'google-oauth2|101046949406679467409', //profile.user_id
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
    });
  }

  $scope.getConducteur = function(){
    $scope.loading = $ionicLoading.show({
      content: 'Recherche de véhicules en cours...',
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
      }  
    });
  }

  $scope.getMatch = function(){
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
        $ionicLoading.hide();
        match = response.hits.hits[0];
        switch(match._source.etat){
          case 0:
            $scope.loading = $ionicLoading.show({
              content: "Erreur lors de la prise en charge...",
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
            intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 100000);
            break;
          case 1:
            //Rien
            break;
          case 2:
            $scope.loading = $ionicLoading.show({
              content: "Demande acceptée par l'autostoppeur, véhicule en approche (" + match._source.distance + ")",
              showBackdrop: false,
              template: "Demande acceptée par l'autostoppeur, véhicule en approche (" + match._source.distance + ")"
            });
            break;
          default:
            $scope.loading = $ionicLoading.show({
              content: "Félicitation, profitez de votre trajet, vous devrez...",
              showBackdrop: false,
              template: "Félicitation, profitez de votre trajet, vous devrez..."
            });
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

        var match = client.index({
          index: 'matchs',
          type: 'match',
          body: {
            conducteur: conducteur._id,
            autostoppeur: 'google-oauth2|101046949406679467409', //profile.user_id,
            distance: dist,
            etat: 1
          }
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
        });

        $scope.loading = $ionicLoading.show({
          content: 'En attente de la réponse du conducteur...',
          showBackdrop: false,
          template: 'En attente de la réponse du conducteur...'
        });
        $interval.cancel(intervalPromise);
        intervalPromise = $interval(function(){ $scope.checkMatch(); }, 20000);
      }
      else{
        intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 100000);
      }
   });
  }

  $scope.exit = function(){

    //TODO SI exit Supprimer le match + mise à jour du match à 0

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

  $scope.searchConducteur = function() {
    $scope.getCurrentPosition();
    $scope.updatePosition();
    $scope.getConducteur();
  };

  $scope.checkMatch = function() {
    $scope.getCurrentPosition();
    $scope.updatePosition();
    $scope.getMatch();
  };

  intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 100000);
})

.controller('ProfilCtrl', function($scope, $stateParams, store, client) {
  $scope.user = store.get('user');
  $scope.profile = store.get('profile');

  $scope.update = function(user, profile){
    client.index({
      index: 'users',
      type: 'user',
      id: /*profile.user_id*/ 'google-oauth2|101046949406679467409',
      body: {
        nom: user._source.nom,
        mail: /*profile.email,*/ "jules.vanneste@gmail.com",
        marque: user._source.marque,
        modele: user._source.modele,
        couleur: user._source.couleur,
        nbPlaces: user._source.nbPlaces,
        participationDemandee: parseInt(user._source.participationDemandee),
        detour: parseInt(user._source.detour),
        participationMaximale: parseInt(user._source.participationMaximale),
        depose: parseInt(user._source.depose),
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
    });
  }
})

.controller('PlaylistsCtrl', function($scope) {
  $scope.playlists = [
    { title: 'Reggae', id: 1 },
    { title: 'Chill', id: 2 },
    { title: 'Dubstep', id: 3 },
    { title: 'Indie', id: 4 },
    { title: 'Rap', id: 5 },
    { title: 'Cowbell', id: 6 }
  ];
})

.controller('PlaylistCtrl', function($scope, $stateParams) {
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
