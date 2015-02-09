function getPhoneGapPath() {
    if(device.platform.toLowerCase() === "android") {
        return "/android_asset/www/sounds/"
    } else if (device.platform.toLowerCase() === "") {
        
    }
    return "/sounds/"
};

function play() {
    var snd = new Media(getPhoneGapPath()+"beer_can_opening.mp3");
    snd.play();
}