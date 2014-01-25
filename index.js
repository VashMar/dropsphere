var database = require("./db");
var express = require("express");
var cookie = require("cookie");
var sass = require('node-sass');
var COOKIE_SECRET = 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB';
var cookieParser = express.cookieParser(COOKIE_SECRET);
var EXPRESS_SID_KEY = 't3stk3y'
//var RedisStore = require('connect-redis')(express);

var db = database.db;
var app = express();
var sessionStore = new express.session.MemoryStore();
var port = 3500; 

app.set('views', __dirname + '/layouts');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

app.configure(function () {
	 app.use(
	 // sass compilation
     	sass.middleware({
        	src: __dirname + '/sass', //where the sass files are 
         	dest: __dirname + '/public', //where css should go
         	debug: true // obvious
   	  	})
     );

    app.use(cookieParser);

    app.use(express.session({
      store : sessionStore,
      key   : EXPRESS_SID_KEY,
      cookie: {httpOnly: true}
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


// Routing -- Move to router file eventually 
app.get("/", function(req, res){

 if(req.session.isLogged == true){ 
   console.log("This session belongs to:" + req.session.username);
   res.render("chat", {name: req.session.username});
 }else{
	 res.render("login");
 } 
});


app.post('/login', function (req, res) {
    // We just set a session value indicating that the user is logged in
    req.session.isLogged = true;
    console.log("login hit");
    req.session.username = req.body.name;
    console.log("username is: " + req.session.username);
    res.redirect('/');
});

app.get("/bookmark", function(req, res){
	res.render("bookmark");
});



var io = require('socket.io').listen(app.listen(port));

console.log("Listening on port " + port);



// We configure the socket.io authorization handler (handshake)
io.set('authorization', function (data, callback) {
  console.log("authorizing...");
    if(!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
    }

    // We use the Express cookieParser created before to parse the cookie
    // Express cookieParser(req, res, next) is used initialy to parse data in "req.headers.cookie".
    // Here our cookies are stored in "data.headers.cookie", so we just pass "data" to the first argument of function
    cookieParser(data, {}, function(parseErr) {
        if(parseErr) { return callback('Error parsing cookies.', false); }

        // Get the SID cookie
        var sidCookie = (data.secureCookies && data.secureCookies[EXPRESS_SID_KEY]) ||
                        (data.signedCookies && data.signedCookies[EXPRESS_SID_KEY]) ||
                        (data.cookies && data.cookies[EXPRESS_SID_KEY]);

        // Then we just need to load the session from the Express Session Store
        sessionStore.load(sidCookie, function(err, session) {
            // And last, we check if the used has a valid session and if he is logged in
            if (err || !session || session.isLogged !== true) {
                callback('Not logged in.', false);
            } else {
                // If you want, you can attach the session to the handshake data, so you can use it again later
                data.session = session;

                callback(null, true);
            }
        });
    });
}); 

// messages and user stores -- temporary 
var messages = [];
var users = [];


io.sockets.on('connection', function (socket) {

	socket.on('setName', function(data, greeting){
		greeting({msg: "Welcome to the Sphere, " + data.name});
		socket.join("sphere");
    users.push(data.name);
    io.sockets.emit('users', users);
		socket.broadcast.to("sphere").emit('announcement', { msg: data.name + " joined the Sphere (" + data.time + ")" });
	});

	socket.on('send', function (data) {

    data.msg = parser(data.msg);
    console.log("emitted message");
    var messageData = "<p>" + data.sender + " (" + data.time + ")" + ": " + data.msg  + "</p>";
    messages.push(messageData);      // store the message info on the server
    console.log(messages);
		io.sockets.emit('message', data);

	});

  socket.on('requestMessages', function(fillMessages){
      fillMessages(messages);
      socket.emit('users', users);
  });

});

 function parser(msg) { 
    var res = msg;
    var hasProtocol = msg.indexOf("http://") == 0;

    if( hasProtocol || msg.indexOf("www.") == 0 ){
       
       if(hasProtocol){
        var suffix = /[^.]+$/.exec(msg);

        if(suffix == "jpg" || suffix == "jpeg" || suffix == "gif" || suffix == "png"){
          res = "<a target='_blank' href='";
          res += msg +"'>" ;
          msg = "<img style='max-width:200px; max-height: 200px;' src='" + msg + "'/>";

        }else{
          res = "<a href='";
          res += msg +"'>" ;
          msg = msg.substr(7);
         } 

       }else{
          res = "<a href='http://";
          res += msg +"'>" ;
          msg = msg.substr(4);
        

       }  
         res += msg + "</a>";
    }

    return res;

 }