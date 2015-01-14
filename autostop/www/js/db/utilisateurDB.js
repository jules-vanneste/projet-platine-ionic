//deleteDB("userDB");

var db;
var user;
var DBopenRequest = indexedDB.open("userDB", 1); //si la DB n'existe pas, elle sera créée


DBopenRequest.onerror = function(event) {
	//Handle errors
};

DBopenRequest.onsuccess = function(event) {
	console.log('La BDD existe');
  	db = DBopenRequest.result;
  	//ajoutTest();
};

DBopenRequest.onupgradeneeded = function(event) {
	console.log('Création de la BDD');
	var db = event.target.result;
	var objectStore = db.createObjectStore("user_table", { keyPath: "id_local"});
	//création de la table 'user_table' et ajout des champs
	objectStore.createIndex("id_user", "id_user", { unique: true });
	objectStore.createIndex("user_mail", "user_mail", { unique: true });
	objectStore.createIndex("user_nom", "user_nom", {unique: true});
	objectStore.createIndex("user_marque", "user_marque", {unique: false});
	objectStore.createIndex("user_modele", "user_modele", {unique: false});
	objectStore.createIndex("user_couleur", "user_couleur", {unique: false});
	objectStore.createIndex("user_nbLibre", "user_nbLibre", {unique: false});
	objectStore.createIndex("user_partDemandee", "user_partDemandee", {unique: false});
	objectStore.createIndex("user_distDetour", "user_distDetour", {unique: false});
	objectStore.createIndex("user_partMax", "user_partMax", {unique: false});
	objectStore.createIndex("user_deposeMax", "user_deposeMax", {unique: false});

};

//ajout de données
//data { id_local: 1, id_user: number, user_nom: string, user_mail: string, user_marque: string, etc...};
function addData(data) {
	var transaction = db.transaction(["user_table"], "readwrite");
	var objectStore = transaction.objectStore("user_table");
	var request = objectStore.add(data);
	request.onerror = function(event) {
		console.log('Error in addData: '+ event.target.errorCode);
	}
}

function modifData(data) {
	var transaction = db.transaction(["user_table"], "readwrite");
	var objectStore = transaction.objectStore("user_table");
	var request = objectStore.put(data);
	request.onerror = function(event) {
		console.log('Error in modifData: '+ event.target.errorCode);
	}
}

function getUser() {
	console.log('getUser entred');
	var transaction = db.transaction(["user_table"]);
	var objectStore = transaction.objectStore("user_table");
	var request = objectStore.get(1); /* identifiant 1 */
	request.onerror = function(event) {
	  console.log('Error in getUser()');
	  return;
	};
	request.onsuccess = function(event) {
		user = {
			id_user: request.result.id_user, 
			user_mail: request.result.user_mail,
			user_nom: request.result.user_nom,
			user_marque: request.result.user_marque,
			user_modele: request.result.user_modele,
			user_couleur: request.result.user_couleur,
			user_nbLibre: request.result.user_nbLibre,
			user_partDemandee: request.result.user_partDemandee,
			user_distDetour: request.result.user_distDetour,
			user_partMax: request.result.user_partMax,
			user_deposeMax: request.result.user_deposeMax
		};

		affichage(user);
		
	};
}

function ajoutTest() {
	console.log('Ajout test entred');
	var d = {id_local: 1, id_user: 199, user_mail: 'test@gmail.com', user_nom: 'John', user_marque: 'Ford', user_modele: 'Escort', user_couleur: 'bleue',
				user_nbLibre: 4, user_partDemandee: 0.25, user_distDetour: 1300, user_partMax: 0.25, user_deposeMax: 1000};
	addData(d);
}

function deleteDB(name) {
	var request = window.indexedDB.deleteDatabase(name);
}

function affichage(user) {
	//conducteur
	printElement('nomUser', user.user_nom);
	printElement('marque', user.user_marque);
	printElement('modele', user.user_modele);
	printElement('couleur', user.user_couleur);
	printElement('nbPlaces', user.user_nbLibre);

	changeValueSlider('sliderParticipation', 100, user.user_partDemandee);
	printValueSlider('sliderParticipation', 'resParticipation', 0.01, 2, '€/km');
	changeValueSlider('sliderDistance', 1, user.user_distDetour);
	printValueSlider('sliderDistance', 'resDistance', 1, 0, 'm');

	//piéton
	changeValueSlider('sliderParticipationMax', 100, user.user_partMax);
	printValueSlider('sliderParticipationMax', 'resParticipationMax', 0.01, 2, '€/km');
	changeValueSlider('sliderDepose', 1, user.user_deposeMax);
	printValueSlider('sliderDepose', 'resDepose', 1, 0, 'm');

}