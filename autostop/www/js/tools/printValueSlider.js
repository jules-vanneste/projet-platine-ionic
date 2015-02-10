function printValueSlider(idSlider, idRes, multiplicateur, decimal, finChaine){
	var slider = document.getElementById(idSlider);
	var res = document.getElementById(idRes);
	var value = slider.value * multiplicateur;

	res.innerHTML = value.toFixed(decimal) + " " + finChaine;
}

function changeValueSlider(idSlider, multiplicateur, value) {
	var slider = document.getElementById(idSlider);
	slider.value = value * multiplicateur;
}

function printElement(idElement, value) {
	var element = document.getElementById(idElement).value = value;
}