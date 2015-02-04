/** permet d'afficher dans le profil les informations de l'utilisateur **/
function ajouterOption(idSelect, valeur, geo) {
	var opt = document.createElement("option");
	opt.innerHTML = valeur;
	opt.value = geo;
	document.getElementById(idSelect).appendChild(opt);
}
/*
function deleteFirstOption(idSelect) {
	var select = document.getElementById(idSelect);
	console.log(select.firstChild)
	select.removeChild(select.firstChild);
}
*/