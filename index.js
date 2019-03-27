const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const Sentencer = require('sentencer');

const app = express();
const server = http.Server(app);
const io = socketio(server);

let rooms = {};
let players = {};

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function generatePrompt(){
  return (random(0,1) == 0 ? Sentencer.make("{{an_adjective}} {{noun}}."):Sentencer.make("{{adjective}} {{nouns}}."));
}

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.sendFile(path.resolve('index.html'));
});

app.get('/room', (req, res) => {
  if(Object.keys(rooms).indexOf(`${req.query.key}`) == -1){
    rooms[req.query.key] = {players: {}, prompt: generatePrompt()};

  }
  res.sendFile(path.resolve('index.html'));
});

io.on('connection', socket => {
  console.log('new connection');
  socket.on('name', data => {
    try{
      let pass = true;
      Object.values(rooms[players[socket.id]]['players']).forEach(value => {
        if(value['name'] == data || data.length<4) pass = false;
      });
      if(pass){
        rooms[players[socket.id]]['players'][socket.id]['name'] = data;
        io.to(players[socket.id]).emit('newPlayer', data);
        const temp = Object.values(rooms[players[socket.id]]['players']).map(player => player.name);
        socket.emit('nameResult', {
          good: true,
          players: temp,
          player: rooms[players[socket.id]]['players'][socket.id]['num'],
          prompt: rooms[players[socket.id]]['prompt'],
        });
      }
      else{
        socket.emit('nameResult', {good: false});
      }
    }
    catch(err){}
  });
  socket.on('room', data => {
    try{
      socket.join(data);
      rooms[data]['players'][socket.id] = {name: null, num: Object.keys(rooms[data]['players']).length};
      players[socket.id] = data;
    }
    catch(err){}
  });
  socket.on('disconnect', data => {
    try{
      if(rooms[players[socket.id]]){
        if(rooms[players[socket.id]]['players'][socket.id] != undefined && rooms[players[socket.id]]['players'][socket.id]['name'] != null){
          if(rooms[players[socket.id]]['players'][socket.id]['num'] == 0) io.to(players[socket.id]).emit('reload', {});
          io.to(players[socket.id]).emit('disconnected', rooms[players[socket.id]]['players'][socket.id]['name']);
          delete rooms[players[socket.id]]['players'][socket.id];
          if(Object.keys(rooms[players[socket.id]]['players']).length == 0){
            if(rooms[players[socket.id]]['running']) clearInterval(rooms[players[socket.id]]['tick']);
            delete rooms[players[socket.id]];
          }
        }
      }
    }
    catch(err){}
  });
  socket.on('startGame', data => {
    try{
      if(rooms[players[socket.id]]['players'][socket.id]['num'] == 0){
        const leaderIn = data.leaderIn;
        _players = rooms[players[socket.id]]['players'];
        rooms[players[socket.id]]['startTime'] = parseInt(data.turn);
        rooms[players[socket.id]]['order'] = [];
        rooms[players[socket.id]]['orderID'] = [];
        rooms[players[socket.id]]['pixels'] = [];
        rooms[players[socket.id]]['rounds'] = parseInt(data.rounds);
        rooms[players[socket.id]]['round'] = 0;
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
    }
    catch(err){}
  });
  socket.on('pixelAdd', coord => {
    try{
      if(socket.id == rooms[players[socket.id]]['orderID'][rooms[players[socket.id]]['turn']]){
        rooms[players[socket.id]]['pixels'].push(coord);
        io.to(players[socket.id]).emit('addPixel', coord);
      }
    }
    catch(err){}
  });
  socket.on('pixelRemove', coord => {
    try{
      if(socket.id == rooms[players[socket.id]]['orderID'][rooms[players[socket.id]]['turn']]){
        rooms[players[socket.id]]['pixels'].pop(coord);
        io.to(players[socket.id]).emit('removePixel', coord);
      }
    }
    catch(err){}
  });
  socket.on('newPrompt', data => {
    try{
      if(rooms[players[socket.id]]['players'][socket.id]['num'] == 0){
        if(Object.keys(data).indexOf('prompt') != -1) rooms[players[socket.id]]['prompt'] = data['prompt'];
        else rooms[players[socket.id]]['prompt'] = generatePrompt();
        io.to(players[socket.id]).emit('newPrompt', rooms[players[socket.id]]['prompt']);
      }
    }
    catch(err){}
  });
  socket.on('newTurn', data => {
    try{
      if(socket.id == rooms[players[socket.id]]['orderID'][rooms[players[socket.id]]['turn']]){
        console.log(data);
        nextTurn(players[socket.id],socket);
      }
    }
    catch(err){}
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
  if(rooms[room]['turn'] == 0) rooms[room]['round']++;
  rooms[room]['running'] = true;
  rooms[room]['time'] = parseInt(rooms[room]['startTime'])+1;
  if(rooms[room]['pixels'] != []){
    rooms[room]['frames'].push({
      name: rooms[room]['order'][rooms[room]['turn']],
      frames: rooms[room]['pixels'],
    });
    rooms[room]['pixels'] = [];
  }
  if(rooms[room]['round'] != rooms[room]['rounds'] +1){
    io.to(players[socket.id]).emit('observe', {name: rooms[room]['order'][rooms[room]['turn']], observe: true});
    const _id =rooms[room]['orderID'][rooms[room]['turn']]
    io.to(`${rooms[room]['orderID'][rooms[room]['turn']]}`).emit('turn', {});
    rooms[room]['tick'] = setInterval(()=>{tick(room,socket)},1000);
  }
  else{
    io.to(players[socket.id]).emit('end', rooms[room]['frames']);
    delete rooms[players[socket.id]];
  }
}

app.use(express.static('static'));

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
