Vue.use(VueMaterial.default);
Vue.config.productionTip = false;

const socket = io();

let data ={
  screen: "home",
  roomCode: "",
  name: "",
  showSnack: false,
  snackMessage: '',
  players: [],
  leader: false,
  turn: false,
  drawer: '',
  time: null,
  doc: document.body,
  tool: 'pencil',
  pixels: [],
  clicking: false,
  author: '',
  leaderIn: false,
  rounds: 3,
  turn: 30,
}

let methods = {
  createRoom(){
    const key = this.random(10000000, 99999999);
    location.href += `room?key=${key}`;
  },
  joinRoom(){
    location.href += 'room?key=' + data.roomCode;
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
    socket.emit('startGame', {leaderIn: data.leaderIn, rounds: data.rounds, turn: data.turn});
  },
  handlePixel(coord,type){
    if(data.turn && (data.clicking || type=='c') && data.tool == 'pencil') socket.emit('pixelAdd',coord);
    if(data.turn && (data.clicking || type=='c') && data.tool == 'eraser') socket.emit('pixelRemove',coord);
  },
  clearGrid(){
    for(let x=1;x<=50;x++){
      for(let y=1;y<=50;y++){
        document.querySelector(`#x${x}x${y}`).style.backgroundColor = 'rgba(255,255,255,0)';
      }
    }
  },
  animate(frames){
    frames = frames.slice(1, frames.length);
    let time = 0;
    setInterval(() => {
      methods.clearGrid();
      data.author = frames[time%frames.length].name;
      frames[time%frames.length].frames.forEach(pixel => {
        document.querySelector(`#x${pixel[0]}x${pixel[1]}`).style.backgroundColor = 'black';
      });
      time++;
    }, 200);
  },
}

let computed = {

}

Vue.component('grid', {
  props: [
    'pixel',
  ],
  data: () => {return{
    width: 50,
    height: 50,
  }},
  methods: {
    handlePixel: methods.handlePixel,
  },
  template:`
  <div class="row">
    <div class="row grid"  :style="'width:'+pixel*width+'px !important'">
      <div class="column" v-for="w in width" :key="w">
        <div class="pixel" v-for="h in height" :key="h" :style="'width:'+pixel+'px;height:'+pixel+'px;'"
        @click="handlePixel([w,h],'c')" @mouseover="handlePixel([w,h],'m')"
        :id="'x'+w+'x'+h"></div>
      </div>
    </div>
  </div>
  `
});

const vm = new Vue({
  el: '#app',
  data: data,
  methods: methods,
  computed: computed
});

document.addEventListener('mousedown', e => {
  data.clicking = true;
});

document.addEventListener('mouseup', e => {
  data.clicking = false;
});

document.addEventListener('touchstart', e => {
  data.clicking = true;
});

document.addEventListener('touchend', e => {
  data.clicking = false;
});

document.addEventListener('touchmove', e => {
  e.preventDefault();
  const _x = e.changedTouches[0].clientX;
  const _y = e.changedTouches[0].clientY;
  const elem = document.elementFromPoint(_x,_y);
  if(elem != undefined && elem.id.indexOf('x') != -1){
    const temp = elem.id.split('x');
    methods.handlePixel([temp[1],temp[2]],'t');
  }
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
  else{
    if(data.name.length < 4) methods.snackbar('Name must be at least 4 characters');
    else methods.snackbar('That name is already taken');

  }
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
  data.screen = 'observe';
  data.turn = false;
  data.drawer = _data.name;
  methods.clearGrid();
});

socket.on('turn', _data => {
  console.log(_data);
  data.screen = 'playing';
  data.turn = true;
  methods.clearGrid();
});

socket.on('time', _time => {
  data.time = _time;
});

socket.on('addPixel', _c => {
  data.pixels.push(_c);
  document.querySelector(`#x${_c[0]}x${_c[1]}`).style.backgroundColor = 'black';
});

socket.on('removePixel', _c => {
  data.pixels.pop(_c);
  document.querySelector(`#x${_c[0]}x${_c[1]}`).style.backgroundColor = 'rgba(255,255,255,0)';
});

socket.on('end', _data => {
  data.screen = 'end';
  methods.animate(_data);
});
