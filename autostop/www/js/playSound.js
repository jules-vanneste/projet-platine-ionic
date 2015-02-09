function getPhoneGapPath() {
    if(device.platform.toLowerCase() === "android") {
        return "/android_asset/www/sounds/"
    } else if (device.platform.toLowerCase() === "ios") {
        return "sounds/"
    } else if (device.platform.toLowerCase() === "blackberry 10") {
        return "/sounds/"
    } else if (device.platform.toLowerCase() === "wince") {
        return "/sounds/"
    }
    return "/sounds/"
};

/* name avec extension */
function play(name) {
    var snd = new Media(getPhoneGapPath()+name);
    snd.play();
}