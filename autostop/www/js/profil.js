/** permet d'afficher dans le profil les informations de l'utilisateur **/
function ajouterOption(idSelect, valeur) {
	var opt = document.createElement("option");
	opt.innerHTML = valeur;
	document.getElementById(idSelect).appendChild(opt);
}
/*
function deleteFirstOption(idSelect) {
	var select = document.getElementById(idSelect);
	console.log(select.firstChild)
	select.removeChild(select.firstChild);
}
*/