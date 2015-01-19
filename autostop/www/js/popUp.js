
function showConfirm() {
 var confirmPopup = $ionicPopup.confirm({
   title: 'Consume Ice Cream',
   template: 'Are you sure you want to eat this ice cream?'
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
function showAlert(title, msg) {
 var alertPopup = $ionicPopup.alert({
   title: title,
   template: template
 });
 /*
 alertPopup.then(function(res) {
   console.log('');
 });
*/
};
