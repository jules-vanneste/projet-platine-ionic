var db;

// Ouverture de la base de données interne adressesDB
function ouvertureBDDandGetAdresses() {
	console.log('ouverture called');
	// Option 1, Ouverture de la base de donnees si elle existe sinon si elle est créée
	var DBopenRequest = indexedDB.open("adressesDB", 1);

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

// Ajout d'une destination dans la base de données { adresse: string, geo: string }
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

// Modification d'une destination dans la base de données
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

// Recupere les destinations dans la base de données
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

// Suppression de la base de données
function deleteDB(name) {
	console.log('delete called');
	var request = window.indexedDB.deleteDatabase(name);
}