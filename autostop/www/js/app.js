// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js

angular.module('starter', ['ionic', 'starter.controllers', 'ion-google-place','starter.services', 'auth0', 'angular-storage', 'angular-jwt', 'elasticsearch'])

.service('client', function (esFactory) {
  return esFactory({
    host: 'http://vps132885.ovh.net:9200'
  });
})

.config(function($stateProvider, $urlRouterProvider, authProvider, $httpProvider,
  jwtInterceptorProvider) {

    jwtInterceptorProvider.tokenGetter = function(store, jwtHelper, auth) {
      var idToken = store.get('token');
      var refreshToken = store.get('refreshToken');
      // If no token return null
      if (!idToken || !refreshToken) {
        return null;
      }
      // If token is expired, get a new one
      if (jwtHelper.isTokenExpired(idToken)) {
        return auth.refreshIdToken(refreshToken).then(function(idToken) {
          store.set('token', idToken);
          return idToken;
        });
      } else {
        return idToken;
      }
    }

    $httpProvider.interceptors.push('jwtInterceptor');

    authProvider.init({
      domain: 'autostop.auth0.com',
      clientID: 'yRB8UoefOcpGw5Co9c8sRa8VuLG7Wevw',
      loginState: 'login'
    });
})


.run(function(auth) {
  // Hook auth0-angular to all the events it needs to listen to
  auth.hookEvents();
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      //StatusBar.styleDefault();
      StatusBar.styleColor('white');
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: 'AppCtrl',
      data: {
        requiresLogin: false
      }
    })

    /* Ajout pour OAuth */
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl',
    })
    /* Fin Ajout pour OAuth */

    .state('app.accueil', {
      url: "/accueil",
      views: {
        'menuContent' :{
          templateUrl: "templates/accueil.html",
          controller: 'AccueilCtrl'
        }
      }
    })

    .state('app.itineraire', {
      url: "/itineraire/:latitude/:longitude",
      views: {
        'menuContent' :{
          templateUrl: "templates/itineraire.html",
          controller: 'ItineraireCtrl'
        }
      }
    })

    .state('app.recherche', {
      url: "/recherche/:latitude/:longitude",
      views: {
        'menuContent' :{
          templateUrl: "templates/recherche.html",
          controller: 'RechercheCtrl'
        }
      }
    })

    .state('app.profil', {
      url: "/profil",
      views: {
        'menuContent' :{
          templateUrl: "templates/profil.html",
          controller: 'ProfilCtrl'
        }
      }
    })

    .state('app.favoris', {
      url: "/favoris",
      views: {
        'menuContent' :{
          templateUrl: "templates/favoris.html",
          controller: 'FavorisCtrl'
        }
      }
    })
    
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/accueil');
});