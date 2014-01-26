var express = require("express");
var cookie = require("cookie");
var sass = require('node-sass');
var mongoose = require('mongoose'),
    User     = require('./models/user'),
    Sphere   = require('./models/sphere'),
    Demosphere = require('./models/demo_sphere'),
    Message   = require('./models/message');

var COOKIE_SECRET = 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB';
var cookieParser = express.cookieParser(COOKIE_SECRET);
var EXPRESS_SID_KEY = 't3stk3y'
//var RedisStore = require('connect-redis')(express);

var app = express();
var sessionStore = new express.session.MemoryStore();
var port = 3500; 

// db connection
mongoose.connect("mongodb://localhost:27017/dropsphere_dev");

// messages and user stores -- temporary 
var messages = [],
    users = [];


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

    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());

    app.set('views', __dirname + '/layouts');
    app.set('view engine', "jade");
    app.engine('jade', require('jade').__express);

});


// Routing -- Move to router file eventually //////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/", function(req, res){
   res.render("home");
});

// demo login that tracks a guest users session and ties their username to the session 
app.get('/demo', function (req, res) {
    res.render("demo");
});


app.post('/login', function (req, res) {
    // We just set a session value indicating that the user is logged in
    req.session.isLogged = true;
    req.session.username = req.body.name;
    console.log(req.session.username + " is logged in");
    res.redirect('/bookmark');
});


// data sent to bookmarklet 
app.get("/bookmark", function(req, res){
	 if(req.session.isLogged == true){ 
      res.render("chat", {name: req.session.username});
   }else{
      res.render("login");
   } 
});

// issue sign up form
app.get("/join", function(req, res){
     res.render("join");
});

//signup 
app.post("/signup", function(req, res){
  console.log("signing up user with credentials: " + req.body.name);
   // get parameters 
    var name = req.body.name,
        password = req.body.password,
        email = req.body.email,
        session = req.sessionID;

        //try to create
         var user = new User({name: name, email: email, password: password});
         user.save( function(err, user){

           if(err){ console.log("validation errors:" + err); } // respond with validation errors here
           
           else{
              console.log("created user: " + name);
              // create a sphere for the user   
              var sphere = new Sphere({name: name + "'s sphere", owner: user._id });
              // add user as sphere member
              sphere.members.push(user);
              sphere.save(function(err, sphere){
                if(err){ console.log("Error saving sphere"); }

                else {
                  console.log("created sphere: " + sphere.name);
                  // log the user in
                  req.session.isLogged = true;
                  req.session.username = name;
                  res.redirect('/bookmark');
                }  
              });
            }
        });      
}); 


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// connect websockets to our server 
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
                data.sessionID = sidCookie;
                callback(null, true);
            }
        });
    });
}); 


// socket listeners and chat events //////////////////////////////////////////////////////////////////////////////////////////////////////////////

io.sockets.on('connection', function (socket) {
  console.log(socket.handshake.sessionID);   // on connection find out who the user is using the sessionID;
                                             // if there was no user found then the session is a demo, create a demosphere and plop them in
                                             // get all the users spheres and connect to them 
                                             // request messages from the users main sphere (first in array)


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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// parser to discover if the message is a link or not
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
    res = res.replace(/\n/g, '<br />');
    return res;

 }