var db;
/** création si non existance **/
function ouvertureBDD() {
	console.log('ouverture called');
	var DBopenRequest = indexedDB.open("adressesDB", 1); //si la DB n'existe pas, elle sera créée
	DBopenRequest.onerror = function(event) {
	//Handle errors
	};

	DBopenRequest.onsuccess = function(event) {
		console.log('La BDD existe');
	  	db = DBopenRequest.result;
	};

	DBopenRequest.onupgradeneeded = function(event) {
		console.log('Création de la BDD');
		var db = event.target.result;
		var objectStore = db.createObjectStore("adresses", { keyPath:"id", autoIncrement: true});
		objectStore.createIndex("adresse", "adresse", {unique: true});
		objectStore.createIndex("geo", "geo", {unique: false});
	};
}

/* pas propre... */
function ouvertureBDDandGetAdresses() {
	console.log('ouverture called');
	var DBopenRequest = indexedDB.open("adressesDB", 1); //si la DB n'existe pas, elle sera créée
	DBopenRequest.onerror = function(event) {
	//Handle errors
	};

	DBopenRequest.onsuccess = function(event) {
	  	db = DBopenRequest.result;
	  	getAdresses("favSelect");
	};

	DBopenRequest.onupgradeneeded = function(event) {
		console.log('Création de la BDD');
		var db = event.target.result;
		var objectStore = db.createObjectStore("adresses", { keyPath:"id", autoIncrement: true});
		objectStore.createIndex("adresse", "adresse", {unique: true});
		objectStore.createIndex("geo", "geo", {unique: false});
	};
}

//ajout de données
//data { adresse: string, geo: string }
function addData(data) {
	var defer = $.Deferred();
	var isOk;
	var transaction = db.transaction(["adresses"], "readwrite");
	var objectStore = transaction.objectStore("adresses");
	var request = objectStore.add(data);
	request.onerror = function(event) {
		console.log('Error in addData: '+ event.target.errorCode);
		isOk = false;
		defer.resolve(isOk);
	}
	request.onsuccess = function(event) {
		isOk = true;
		defer.resolve(isOk);
	}
	return defer.promise();
}

function modifData(data) {
	var transaction = db.transaction(["adresses"], "readwrite");
	var objectStore = transaction.objectStore("adresses");
	var request = objectStore.put(data);
	request.onerror = function () {
		console.log('Update error: ' + e)
	}
	request.onsuccess = function() {
		getAdresses();
	}
}

/** récupération de l'utilisateur et appel de la fonction d'affichage **/
function getAdresses(selectName) {
	var defer = $.Deferred();
	var listeAdresses = [];
	var transaction = db.transaction(["adresses"]);
	var objectStore = transaction.objectStore("adresses");
	objectStore.openCursor().onsuccess = function(event) {
	  	var cursor = event.target.result;
		  if (cursor) {
		    listeAdresses.push(cursor.value.adresse);
		   	ajouterOption(selectName, cursor.value.adresse, cursor.value.geo);
		    cursor.continue();
		  }
		  else {
		  	/* no more entries */
		    defer.resolve(listeAdresses);
		  }
	};
	return defer.promise();
}

function deleteDB(name) {
	console.log('delete called');
	var request = window.indexedDB.deleteDatabase(name);
}