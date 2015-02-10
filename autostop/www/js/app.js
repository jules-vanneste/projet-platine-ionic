// Declaration des modules, services et controllers de l'application
angular.module('starter', ['ionic', 'AppController', 'LoginController', 'AccueilController', 'ItineraireController', 'RechercheController', 'ProfilController', 'ion-google-place', 'auth0', 'angular-storage', 'angular-jwt', 'elasticsearch'])

// Declaration du VPS pour elasticsearch
.service('client', function (esFactory) {
  return esFactory({
    host: 'http://vps132885.ovh.net:9200'
  });
})

// Configuration de l'application
.config(function($stateProvider, $urlRouterProvider, authProvider, $httpProvider, jwtInterceptorProvider) {
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

// Hook auth0-angular to all the events it needs to listen to
.run(function(auth) {
  auth.hookEvents();
})

// Customization the accessory bar
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleColor('white');
    }
  });
})

// Routage Controller & Vue
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: 'AppCtrl',
      data: {
        requiresLogin: true
      }
    })

    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl',
    })

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
    
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/accueil');
});