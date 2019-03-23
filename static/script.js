Vue.use(VueMaterial.default);
Vue.config.productionTip = false;

const socket = io();

let data ={
  screen: "home",
  roomCode: null,
  name: "",
  showSnack: false,
  snackMessage: '',
  players: [],
  leader: false,
  turn: false,
  drawer: '',
  time: null,
}

let methods = {
  createRoom(){
    const key = this.random(10000000, 99999999);
    location.href += `room?key=${key}`;
  },
  random(min, max){
    return Math.floor(Math.random() * max) + min
  },
  sendName(){
    data.showSnack = false;
    socket.emit('name', data.name);
  },
  snackbar(message){
    data.snackMessage = message;
    data.showSnack = true;
  },
  addPlayer(name){
    data.players.push(name);
  },
  removePlayer(name){
    data.players.pop(name);
  },
  startGame(){
    socket.emit('startGame', {});
  }
}

let computed = {

}

const vm = new Vue({
  el: '#app',
  data: data,
  methods: methods,
  computed: computed
});

if(location.href.indexOf('/room') != -1){
  data.screen = 'name';
  data.roomCode = new URL(location.href).searchParams.get('key');
  socket.emit('room', data.roomCode);
}

socket.on('nameResult', back => {
  if(back.good){
    data.screen = 'lobby';
    data.players = back.players;
    if(back.player == 0) data.leader = true;
  }
  else methods.snackbar('That name is already taken');
});

socket.on('newPlayer', name => {
  methods.addPlayer(name);
});

socket.on('disconnected', name => {
  console.log(name);
  methods.removePlayer(name);
});

socket.on('reload', data => {
  location.reload();
});

socket.on('observe', _data => {
  data.screen == 'observe';
  data.turn = false;
  data.drawer = _data.name;
});

socket.on('turn', _data => {
  data.screen == 'playing';
  data.turn = true;
})
