/** permet d'afficher dans le profil les informations de l'utilisateur **/
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

function recupProfil() {
	var data = {
		id_local: 1,
		id_user: idUser,
		user_mail: 'test@gmail.com',
		user_nom: recupChamp('nomUser'),
		user_marque: recupChamp('marque'),
		user_modele: recupChamp('modele'),
		user_couleur: recupChamp('couleur'),
		user_nbLibre: recupChamp('nbPlaces'),
		user_partDemandee: recupChamp('resParticipation'),
		user_distDetour: recupChamp('resDistance'),
		user_partMax: recupChamp('resParticipationMax'),
		user_deposeMax: recupChamp('resDepose')
	}
	return data;
}

function recupChamp(idElement) {
	return document.getElementById(idElement).value;
}