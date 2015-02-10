
angular.module('RechercheController', [])
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
      console.log("Recherche > setDestination", "On met à jour la destination de l'autostoppeur sur le serveur");
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
              autostoppeur: 'google-oauth2|101046949406679467409', //profile.user_id,
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
              autostoppeur: 'google-oauth2|101046949406679467409', //profile.user_id,
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

    $scope.exit = function(){
      console.log("Recherche > exit", "On quitte la navigation");
      //TODO SI exit Supprimer le match + mise à jour du match à 0
      console.log("match", JSON.stringify(match));
      $ionicLoading.hide();
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
  });