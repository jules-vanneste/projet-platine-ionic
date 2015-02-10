angular.module('LoginController', [])
  .controller('LoginCtrl', function($scope, auth, $state, store, client) {
    auth.signin({
      authParams: {
        // This asks for the refresh token So that the user never has to log in again
        scope: 'openid offline_access',
        // This is the device name
        device: 'Mobile device'
      },
      // Make the widget non closeable
      standalone: true
    }, function(profile, token, accessToken, state, refreshToken) {
      // Login was successful We need to save the information from the login
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
  });