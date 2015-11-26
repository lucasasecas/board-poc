var express = require('express'); 
var app = express.static(__dirname + '/../');

var http = require('http').Server(app);
var io = require('socket.io')(http);

var board = {};

io.on('connection', function(socket){
  console.log("connection");
  socket.on('board', function(msg){
    console.log(msg);
    //io.emit('board', msg);
  });
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});
