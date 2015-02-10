// Fonction permettant de calculer la distance entre deux points
// Option K : distance en km
// Option M : distance en m
function distance(lat1, lon1, lat2, lon2, unit) {
     var radlat1 = Math.PI * lat1/180;
     var radlat2 = Math.PI * lat2/180;
     var radlon1 = Math.PI * lon1/180;
     var radlon2 = Math.PI * lon2/180;
     var theta = lon1-lon2;
     var radtheta = Math.PI * theta/180;
     var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
     dist = Math.acos(dist);
     dist = dist * 180/Math.PI;
     dist = dist * 60 * 1.1515;
     if (unit=="K") { dist = dist * 1.609344; }
     if (unit=="M") { dist = dist * 1.609344 * 1000; }
     return dist;
}