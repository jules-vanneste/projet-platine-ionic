ion.sound({
    sounds: [
        {
            name: "button_click",
            volume: 1.0
        },
        {
            name: "notify_sound",
            volume: 1.0
        },
        {
            name: "alert_sound",
            volume: 1.0,
            preload: false
        }
    ],
    volume: 0.5,
    path: "sounds/",
    preload: true
});

function play() {
    console.log('play called');
    ion.sound.play("button_click");
}