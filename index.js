var database = require("./db");
var express = require("express");
var cookie = require("cookie");
var sass = require('node-sass');
var parseCookie = require('connect').utils.parseCookie;

//var RedisStore = require('connect-redis')(express);

var db = database.db;
var app = express();
var session = new express.session.MemoryStore();
var port = 3500; 

app.set('views', __dirname + '/layouts');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'));

app.configure(function () {
	 app.use(
	 // sass compilation
     	sass.middleware({
        	src: __dirname + '/sass', //where the sass files are 
         	dest: __dirname + '/public', //where css should go
         	debug: true // obvious
   	  	})
     );

    app.use(express.cookieParser());

    app.use(express.session({
      store : session,
      secret: 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB', 
      key   : 't3stk3y',
      cookie: {maxAge : 60 * 60 * 1000}
    }));
});

/*app.use(express.cookieParser());

 var store = new RedisStore({
    host: '192.168.1.10',
    port: 6379,
    db: 0,
    pass: 'MFAwDQYJKoZIhvcNAQEBBQADPwAwPAI1Cz02/4pZZRRse4zsLhRddMeiaMAU8VBlpzaOwghEZGz6yEBD9rRUec+zvrZgEnBMYWszqnECAwEAAQ=='
  });

app.use(express.session({
  store: store, 
  secret: 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB'
})); */



app.get("/", function(req, res){
	res.render("home");
	//var session = store.get(req.session.id);
	console.log(req.session.id);
});


app.get("/bookmark", function(req, res){
	res.render("bookmark");
});



var io = require('socket.io').listen(app.listen(port));

console.log("Listening on port " + port);


 io.set('authorization', function (data, accept) {
 console.log(data);
 /* if (data.headers.cookie) {

      data.cookie = parseCookie(data.headers.cookie);

      data.sessionID = data.cookie['express.sid'];

  } else {
    return accept('No cookie transmitted.', false);
  } */

  accept(null, true);
 });  

io.sockets.on('connection', function (socket) {
	console.log("Socket id:" + socket.id);
	socket.on("setName", function(data, greeting){
		greeting({msg: "Welcome to the Sphere, " + data.name});
		socket.join("sphere");
		socket.broadcast.to("sphere").emit('announcement', { msg: data.name + " joined the Sphere (" + data.time + ")" });
	});

	socket.on('send', function (data) {
		io.sockets.emit('message', data);
	});
});