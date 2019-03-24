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
      socket.emit('nameResult', {
        good: true,
        players: temp,
        player: rooms[players[socket.id]]['players'][socket.id]['num'],
      });
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
    if(rooms[players[socket.id]]['players'][socket.id]['num'] == 0){
      console.log('were in');
      const leaderIn = false;
      _players = rooms[players[socket.id]]['players']
      rooms[players[socket.id]]['startTime'] = 30;
      rooms[players[socket.id]]['order'] = [];
      rooms[players[socket.id]]['orderID'] = [];
      rooms[players[socket.id]]['pixels'] = [];
      rooms[players[socket.id]]['rounds'] = 3;
      rooms[players[socket.id]]['frames'] = [];
      Object.keys(_players).forEach((_player, index) => {
        if((leaderIn && index == 0) || index > 0){
          rooms[players[socket.id]]['order'].push(_players[_player].name);
          rooms[players[socket.id]]['orderID'].push(_player);
        }
      });
      rooms[players[socket.id]]['turn'] = -1;
      nextTurn(players[socket.id],socket);
    }
  });
  socket.on('pixelAdd', coord => {
    if(socket.id == rooms[players[socket.id]]['orderID'][rooms[players[socket.id]]['turn']]){
      rooms[players[socket.id]]['pixels'].push(coord);
      io.to(players[socket.id]).emit('addPixel', coord);
    }
  });
  socket.on('pixelRemove', coord => {
    if(socket.id == rooms[players[socket.id]]['orderID'][rooms[players[socket.id]]['turn']]){
      rooms[players[socket.id]]['pixels'].pop(coord);
      io.to(players[socket.id]).emit('removePixel', coord);
    }
  });
});

function tick(room,socket){
  rooms[room]['time']--;
  io.to(players[socket.id]).emit('time', rooms[room]['time']);
  if(rooms[room]['time'] == 0) nextTurn(room,socket);
}

function nextTurn(room,socket){
  if(rooms[room]['tick'] != undefined) clearInterval(rooms[room]['tick']);
  rooms[room]['turn'] = (rooms[room]['turn'] + 1) % rooms[room]['order'].length;
  rooms[room]['running'] = true;
  rooms[room]['time'] = rooms[room]['startTime']+1;
  if(rooms[room]['pixels'] != []){
    rooms[room]['frames'].push({
      name: rooms[room]['players'][socket.id],
      frames: rooms[room]['pixels'],
    });
    rooms[room]['pixels'] = [];
  }
  io.to(players[socket.id]).emit('observe', {name: rooms[room]['order'][rooms[room]['turn']], observe: true});
  const _id =rooms[room]['orderID'][rooms[room]['turn']]
  console.log(_id);
  io.to(`${rooms[room]['orderID'][rooms[room]['turn']]}`).emit('turn', {});
  rooms[room]['tick'] = setInterval(()=>{tick(room,socket)},1000);
}

app.use(express.static('static'));

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
