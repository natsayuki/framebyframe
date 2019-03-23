const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketio(server);

let rooms = {};
let players = {};

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.sendFile(path.resolve('index.html'));
});

app.get('/room', (req, res) => {
  if(Object.keys(rooms).indexOf(`${req.query.key}`) == -1){
    rooms[req.query.key] = {players: {}};
  }
  res.sendFile(path.resolve('index.html'));
});

io.on('connection', socket => {
  console.log('new connection');
  socket.on('name', data => {
    let pass = true;
    Object.values(rooms[players[socket.id]]['players']).forEach(value => {
      if(value['name'] == data) pass = false;
    });
    if(pass){
      rooms[players[socket.id]]['players'][socket.id]['name'] = data;
      io.to(players[socket.id]).emit('newPlayer', data);
      const temp = Object.values(rooms[players[socket.id]]['players']).map(player => player.name);
      socket.emit('nameResult', {good: true, players: temp, player: 0});
    }
    else{
      socket.emit('nameResult', {good: false});
    }
  });
  socket.on('room', data => {
    socket.join(data);
    rooms[data]['players'][socket.id] = {name: null, num: Object.keys(rooms[data]['players']).length};
    players[socket.id] = data;
  });
  socket.on('disconnect', data => {
    if(rooms[players[socket.id]] && rooms[players[socket.id]]['players'][socket.id]['name'] != null){
      if(rooms[players[socket.id]]['players'][socket.id]['nums'] == 0) io.to(players[socket.id]).emit('reload', {});
      io.to(players[socket.id]).emit('disconnected', rooms[players[socket.id]]['players'][socket.id]['name']);
      delete rooms[players[socket.id]]['players'][socket.id];
      if(Object.keys(rooms[players[socket.id]]['players']).length == 0) delete rooms[players[socket.id]];
    }
  });
  socket.on('startGame', data => {
    if(rooms[players[socket.id]]['players'][socket.id]['player'] == 0){
      const leaderIn = false;
      io.to(players[socket.id]).emit('observe', {name: rooms[players[socket.id]]['players'][socket.id]['name'], observe: true});
      players = rooms[players[socket.id]]['players']
      rooms[players[socket.id]]['order'] = [];
      Object.keys(players).forEach((_player, index) => {
        if(leaderIn && index == 0) rooms[players[socket.id]]['order'].push(_player);
        else if(index > 0) rooms[players[socket.id]]['order'].push(_player);
      });
      rooms[players[socket.id]]['turn'] = //TOFO

    }
  });
});

function nextTurn(room){

}

app.use(express.static('static'));

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
