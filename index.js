var database = require("./db");
var express = require("express");
var cookie = require("cookie");
var connect = require("connect");
var RedisStore = require('connect-redis')(express);

var db = database.db;
var app = express();
var port = 3500; 

app.set('views', __dirname + '/layouts');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'));

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({secret: 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB', key: 'express.sid'}));
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
	res.render("messenger");
	//var session = store.get(req.session.id);
	console.log(req.session.id);
});

var io = require('socket.io').listen(app.listen(port));

console.log("Listening on port " + port);


/*io.set('authorization', function (handshakeData, accept) {

  if (handshakeData.headers.cookie) {

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

    handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'secret');

    if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
      return accept('Cookie is invalid.', false);
    }

  } else {
    return accept('No cookie transmitted.', false);
  } 

  accept(null, true);
}); */

io.sockets.on('connection', function (socket) {
	socket.on("setName", function(data, greeting){
		greeting({msg: "Welcome to the Sphere, " + data.name});
		socket.join("sphere");
		socket.broadcast.to("sphere").emit('announcement', { msg: data.name + " joined the Sphere (" + data.time + ")" });
	});

	socket.on('send', function (data) {
		io.sockets.emit('message', data);
	});
});