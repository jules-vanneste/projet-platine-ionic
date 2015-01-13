function toggleDiv(e1, e2){
	var button1 = document.getElementById(e1);
	var button2 = document.getElementById(e2);
	if (button1.className.contains("button button-green")) {button1.className = "button button-stable"; button2.className = "button button-green";} else {button1.className = "button button-green"; button2.className = "button button-stable";}
	$('.divToggle').toggle();
	return false;
}