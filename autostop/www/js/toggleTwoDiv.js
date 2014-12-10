function toggleDiv(e1, e2){
	var button1 = document.getElementById(e1);
	button1.className = "button button-green";
	var button2 = document.getElementById(e2);
	button2.className = "button button-stable";
	$('.divToggle').toggle();
	return false;
}