angular.module('RechercheController', [])
  .controller('RechercheCtrl', function($scope, $ionicLoading, $ionicNavBarDelegate, $ionicPopup, $compile, $stateParams, $timeout, $interval, $location, store, client) {
    var latitude, longitude, profile, user, conducteur, intervalPromise, matchs, match, etat=0;
    
    //$scope.hidesBackButton = true;
    $ionicNavBarDelegate.showBackButton(false);

    // Recuperation du profil et des données de l'utilisateur 
    profile = store.get('profile');
    user = store.get('user');
    
    // Fonction appelée lors du chargement de la vue
    $scope.init = function() {
      console.log("rechercheController", "getCurrentPosition");
      $scope.showMap = true;
      $scope.printCarInfo = false;
      $scope.getCurrentPosition(); // Recupere la localisation de l'autostoppeur
      $scope.setDestination(); // Mise à jour de la destination
      $timeout(function() {
        $scope.checkMatchAutostoppeur(); // Check si un match de l'autostoppeur
      }, 1000);
    };

    // Fonction appelée pour récupérer la position actuelle du conducteur
    $scope.getCurrentPosition = function() {
      console.log("rechercheController", "getCurrentPosition");
      navigator.geolocation.getCurrentPosition(function(pos) {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }, function(error) {
        alert('Unable to get location: ' + error.message);
      });
    };

    // Fonction appelée pour mettre a jour la location du conducteur dans elasticsearch
    $scope.updatePosition = function(){
      console.log("rechercheController", "updatePosition");
      // Requete elasticsearch mettant à jour la localisation et le role de l'utilisateur
      client.update({
        index: 'users',
        type: 'user',
        id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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

    // Fonction appelée pour mettre a jour la destination du conducteur
    $scope.setDestination = function(){
      console.log("rechercheController", "setDestination");
      // Requete elasticsearch mettant à jour la destination de l'utilisateur
      client.update({
        index: 'users',
        type: 'user',
        id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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
          id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
        }, function (error, response) {
          console.log("There was an error in elasticsearch request error : ", error);
          console.log("There was an error in elasticsearch request response : ", response);
          // Sauvegarde des données de l'utilisateur
          store.set('user',response);
        });
      });
    }

    // Fonction appelée pour rechercher les conducteurs à proximité
    $scope.getConducteur = function(){
      console.log("rechercheController", "getConducteur");
      
      $scope.loading = $ionicLoading.show({
        showBackdrop: false,
        template: 'Recherche de véhicules en cours...'
      });

      // Requete elasticsearch recherchant un conducteur avec les contraintes
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
        // Si un conducteur a été trouvé
        if(response.hits.total > 0){
          if(matchs != null && matchs.total > 0){
            conducteur = null;
            var i=0;
            var proposer = false;
            // On cherche un conducteur à l'autostoppeur qui n'a pas encore été proposé 
            while(!proposer && i < response.hits.total){
              var j=0;
              var trouver = false;
              while(!trouver && j < matchs.total){
                if((matchs.hits[j]._source.etat == -2) && (matchs.hits[j]._source.conducteur == response.hits.hits[i]._id)){
                  trouver = true;
                }
                j++;
              }
              // Si un conducteur a été trouvé n'ayant pas de match
              if(!trouver){
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
                var texte = conducteur._source.nom + " est disponible à " + dist.toFixed(0) + "m, Souhaitez-vous envoyer une demande de prise en charge à ce conducteur ?";
                
                // On demande à l'autostoppeur si il souhaite envoyer une demande de prise en charge à ce conducteur
                $scope.showConfirm("Véhicule à proximité", texte);
              }
              i++;
            }
            // Si un nouveau conducteur a été trouvé, on l'indique à l'autostoppeur. On demande à l'autostoppeur si il souhaite envoyer une demande de prise en charge à ce conducteur
            if(!proposer){
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: 'Recherche de véhicules en cours...'
              });
            }
          }
          else{
            // Sinon pas de match, on propose le premier conducteur
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
            var texte = conducteur._source.nom + " est disponible à " + dist.toFixed(0) + "m, Souhaitez-vous envoyer une demande de prise en charge à ce conducteur ?";
            
            // On demande à l'autostoppeur si il souhaite envoyer une demande de prise en charge à ce conducteur
            $scope.showConfirm("Véhicule à proximité", texte);
          }
        }
        else{
          $scope.loading = $ionicLoading.show({
            showBackdrop: false,
            template: 'Recherche de véhicules en cours...'
          });
        }
      });
    }

    // Fonction appelée pour rechercher les matchs de l'autostoppeur
    $scope.getMatchAutostoppeur = function(){
      console.log("rechercheController", "getMatchAutostoppeur");
      // Requete elasticsearch cherchant les matchs du conducteur via son identifiant
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
        // Si il existe un match ayant cet autostoppeur
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
            // Cas si le conducteur a déjà était proposé
            case -2:
              $interval.cancel(intervalPromise);
              $scope.searchConducteur();
              intervalPromise = $interval(function(){ $scope.searchConducteur(); }, 25000);
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: 'Recherche de véhicules en cours...'
              });
              break;
            // Cas si le conducteur vient de quitter la prise en charge 
            case -1:
              $interval.cancel(intervalPromise);
              $scope.loading = $ionicLoading.show({
                showBackdrop: false,
                template: "Le conducteur a quitté la session..."
              });
              // Requete elasticsearch supprimant ce match 
              client.delete({
                index: 'matchs',
                type: 'match',
                id: match._id
              }, function (error, response) {
                console.log("There was an error in elasticsearch request error : ", error);
                console.log("There was an error in elasticsearch request response : ", response);
              });
              etat = 0;
              // Nouvelle recherche d'un conducteur
              $timeout(function() {
                $scope.searchConducteur();  
              }, 5000);
              intervalPromise = $interval(function(){ 
                $scope.searchConducteur(); }, 
              25000);
              break;
            // Cas si l'autostoppeur avait quitté une première fois la prise en charge par ce conducteur  
            case 0:
              break;
            // Cas lorsqu'un autostoppeur demande à se faire prendre en charge par ce conducteur
            case 1:
              if(etat!=1){
                $interval.cancel(intervalPromise);
                $scope.loading = $ionicLoading.show({
                  showBackdrop: false,
                  template: 'En attente de la réponse du conducteur...'
                });
                $scope.checkMatchAutostoppeur();

                intervalPromise = $interval(function(){ 
                  $scope.checkMatchAutostoppeur(); 
                }, 
                25000);
                etat = 1;
              }
              break;
            // Cas lorsqu'un autostoppeur attend la réponse pour se faire prendre en charge par ce conducteur
            case 2:
              if(etat != 2){
                $interval.cancel(intervalPromise);
                $scope.printCarInfo = true;
                $scope.loading = $ionicLoading.show({
                  showBackdrop: false,
                  template: "Demande acceptée par le conducteur, véhicule en approche (" + match._source.distance + ")"
                });
                $scope.checkMatchAutostoppeur();
                intervalPromise = $interval(function(){ 
                  $scope.checkMatchAutostoppeur(); 
                }, 25000);
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
            // Cas lorsqu'un autostoppeur a pris en charge l'autostoppeur  
            case 3:
              $scope.resume();
              break;
            default:
              break;
          }
        }
        else{
          console.log("rechercheController", "Pas de match pour l'autostoppeur");
          $interval.cancel(intervalPromise);
          // Nouvelle recherche de conducteur
          $scope.searchConducteur();
          intervalPromise = $interval(function(){ 
            $scope.searchConducteur(); 
          }, 25000);
          $scope.loading = $ionicLoading.show({
            showBackdrop: false,
            template: 'Recherche de véhicules en cours...'
          });
        }
      });
    }

    // Fonction appelée lorsqu'un conducteur a été trouvé est à proximité
    $scope.showConfirm = function(title, question) {
       var confirmPopup = $ionicPopup.confirm({
         title: title,
         template: question,
         cancelText: 'Non',
         okText: 'Oui',
         okType: 'button-balanced'
      });
      confirmPopup.then(function(res) {
      // Si l'autostoppeur confirme la demande de prise en charge
       if(res) {
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

          // Requete elasticsearch enregistrant le match à l'état 1
          var match = client.index({
            index: 'matchs',
            type: 'match',
            body: {
              conducteur: conducteur._id,
              autostoppeur: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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
          intervalPromise = $interval(function(){ 
            $scope.checkMatchAutostoppeur(); 
          }, 25000);
        }
        else{
          // Sinon si l'autostoppeur ne souhaite pas envoyer de demande de prise en charge à ce conducteur
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

          // Requete elasticsearch enregistrant le match à l'état -2
          var match = client.index({
            index: 'matchs',
            type: 'match',
            body: {
              conducteur: conducteur._id,
              autostoppeur: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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
          intervalPromise = $interval(function(){ 
            $scope.checkMatchAutostoppeur(); 
          }, 25000);
        }
     });
    }

    // Fonction appelée lorsque le conducteur est proche de l'autostoppeur
    $scope.showConfirmPris = function(title, question) {
       var confirmPopup = $ionicPopup.confirm({
         title: title,
         template: question,
         cancelText: 'Non',
         okText: 'Oui',
         okType: 'button-balanced'
      });
      // Boite de dialogue demandant à l'autostoppeur si il a été trouvé par le conducteur
      confirmPopup.then(function(res) {
      // Si il a trouvé le conducteur, on affiche un récapitulatif
       if(res) {
          $scope.resume();
        }
        else{
          // Sinon on relance la recherche des matchs et on demandera de nouveau 
          $scope.loading = $ionicLoading.show({
            showBackdrop: false,
            template: "En attente de l'arrivé du conducteur..."
          });
          $interval.cancel(intervalPromise);
          intervalPromise = $interval(function(){ 
            $scope.checkMatchAutostoppeur(); 
          }, 25000);
        }
     });
    }

    // Fonction appelée lorsque l'autostoppeur clique sur le bouton 'Quitter la navigation'
    $scope.exit = function(){
      console.log("Recherche > exit", "On quitte la navigation");
      $ionicLoading.hide();

      // Requete elasticsearch mettant à jour le role, la location et la destination de l'autostoppeur
      client.update({
        index: 'users',
        type: 'user',
        id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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

      // Si un match en cours ayant cet autostoppeur
      if(match != null){
        if(match._source.etat == -1 ){
          // Requete elasticsearch supprimant tous le match
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

    // Fonction appelée lorsque l'autostoppeur a été pris en charge et click sur le bouton 'Continuer'
    $scope.terminer = function(){
      console.log("Recherche > exit", "On quitte la navigation");
      $ionicLoading.hide();

      // Requete elasticsearch mettant à jour le role, la location et la destination de l'autostoppeur
      client.update({
        index: 'users',
        type: 'user',
        id: profile.user_id,/* 'google-oauth2|101046949406679467409',*/
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

    // Fonction appelée lorsque l'autostoppeur a atteint sa destination finale et click sur le bouton 'Continuer'
    $scope.resume = function(){
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

      // Requete elasticsearch mettant à jour le match a l'état 3 lorsque l'autostoppeur a été trouvé
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

      // Requete elasticsearch recherchant les matchs de l'autostoppeur
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
          for(var i=0; i<response.hits.total; i++){
            if(response.hits.hits[i]._source.etat==-2){
              // Requete elasticsearch supprimant les matchs à l'état -2
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
      // On envoi les données à la vue pour le récapitulatif
      $scope.participationDemandee=conducteur._source.participationDemandee.toFixed(2);
      $scope.distanceTotale=match._source.distanceTotale.toFixed(0);
      $scope.cout=match._source.cout.toFixed(2);
    }
  });