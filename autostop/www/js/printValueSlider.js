function printValueSlider(idSlider, idRes, multiplicateur, decimal, finChaine){
	var slider = document.getElementById(idSlider);
	var res = document.getElementById(idRes);
	var value = slider.value * multiplicateur;

	res.innerHTML = value.toFixed(decimal) + " " + finChaine;
}