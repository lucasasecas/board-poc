var rfc6902 = require('rfc6902');
var express = require('express'); 
var app = express.static(__dirname + '/../');

var http = require('http').Server(app);
var io = require('socket.io')(http);

var board = {};
var shadow = {};

io.on('connection', function(socket){
  console.log("connection");
  // TODO: send current board at first connection
  socket.on('board', function(msg){
    if (msg.patch) {
      rfc6902.applyPatch(board, msg.patch);
    }
  });
});

var count = 0;
var interval = 1000;
var logInterval = 10000;
setInterval(function() {
  var changes = rfc6902.createPatch(shadow, board);
  if (changes.length) {
    shadow = JSON.parse(JSON.stringify(board));
    io.emit('board', { patch: changes });
  }
  if (!(count++ % (logInterval / interval))) {
    console.log(board);
  }
}, interval);



http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});
