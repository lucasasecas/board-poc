var rfc6902 = require("rfc6902");
var express = require("express"); 
var app = express.static(__dirname + "/../");

var http = require("http").Server(app);
var io = require("socket.io")(http);

var shadow = { };

var current = JSON.parse(JSON.stringify(shadow));

io.on("connection", function(socket){
  console.log("connection");
  // TODO: send current board at first connection
  socket.on("board", function(msg){
    if (msg.patch) {
      //var previous = JSON.parse(JSON.stringify(shadow));
      var output = rfc6902.applyPatch(current, msg.patch);
      //console.log({ received_patch: msg.patch, current: current, shadow: shadow, output: output });
      //console.log({ current_notes: current.notes, shadow_notes: shadow.notes });
    }
  });
});

var interval = 1000;
setInterval(function() {
  // I am clonnig patch because the created objects has the same reference 
  var changes = JSON.parse(JSON.stringify(rfc6902.createPatch(shadow, current)));
  if (changes.length) {
    //console.log({ emit_patch: changes, current: current, shadow: shadow });
    rfc6902.applyPatch(shadow, changes);
    io.emit("board", { patch: changes });
  }
}, interval);


http.listen(process.env.PORT || 3000, function(){
  console.log("listening on *:3000");
});
