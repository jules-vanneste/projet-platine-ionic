function jouerSon(son) {
document.getElementById("musique").innerHTML = '<object type="audio/mpeg" width="0" height="0" data="'+son+'"><param name="filename" value="'+son+'" /><param name="autostart" value="true" /><param name="loop" value="false" /></object>';
}
function arreteSon() {
$("musique").innerHTML = '';
}