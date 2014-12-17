// Code to create object stores and add data
$.indexedDB("databaseName", {
"schema": {
"1": function(versionTransaction){
versionTransaction.createObjectStore("objectStore1");
},
"2": function(versionTransaction){
versionTransaction.createObjectStore("objectStore2");
}
}
}).transaction(["objectStore1", "objectStore2"]).then(function(){
console.log("Transaction completed");
}, function(){
console.log("Transaction aborted");
}, function(t){
console.log("Transaction in progress");
t.objectStore("objectStore1").add({
"valueProp": "val",
"anotherProp": 2
}, 1).then(function(){
console.log("Data added");
}, function(){
console.log("Error adding data");
});
});