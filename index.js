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

// demosphere for users testing the product 
demosphere = new Demosphere();

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

// renders a demo login page 
app.get('/demo', function (req, res) {
    res.render("demo");
});

// demo login that tracks a guest users session and ties their username to the session 
app.post('/demologin', function (req, res) {
    // We just set a session value indicating that the user is logged in
    req.session.isLogged = true;
    req.session.username = req.body.name;
    console.log(req.session.username + " is logged in");
    res.redirect('/bookmark');
});

app.post('/login', function (req, res) {
    
    var email = req.body.email,
        password = req.body.password;

    User.findOne({email: email}, function(err, user){
      if(!user){ 
        console.log("Invalid Email"); 
        res.send(400, err);
      }

      else{
        user.comparePassword(password, function(err, isMatch){
          if(!isMatch){ 
            (console.log("Incorrect Password")); 
             res.send(400, err);
          }

          else{
             req.session.isLogged = true;
             req.session.username = user.name;
             console.log(req.session.username + " is logged in");
             res.send({redirect: '/bookmark'});
             user.session = req.sessionID;
             user.save(function(err){
                if(err){console.log(err);}

                else{
                  console.log("new user session saved");
                }
             });
          }
        });
      }
    }); // end query 
   
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
app.post("/signup", function(req, res, next){
  console.log("signing up user with credentials: " + req.body);
   // get parameters 
    var name = req.body.name,
        password = req.body.password,
        email = req.body.email,
        session = req.sessionID;

    //try to create
    var user = new User({name: name, email: email, password: password, session: session});

    user.save( function(err, user){
        // respond with validation errors here
        if(err){ 
          console.log("validation errors:" + err); 
          res.send(400, err);
        } else{
          console.log("created user: " + name);
          // log the user in
          req.session.isLogged = true;
          req.session.username = name;
          res.send({redirect: '/bookmark'});
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


/////////// socket listeners and chat events -- a lot of code needs transferring to models //////////////////////////////////////////////////////////

io.sockets.on('connection', function (socket) {
  var connection = socket.handshake;
  // on connection find out who the user is using the sessionID;
  User.findOne({session: connection.sessionID}).populate('spheres.object').exec(function(err, user){

      if(err){console.log(err);}

      // if there was no user found then the session is a demo plop them in the demosphere
      if(!user){
          var demouser = connection.session.username;
          demosphere.members.push(demouser); 
          console.log(demouser + " added to demosphere");
          socket.join('demosphere');
          io.sockets.in('demosphere').emit('users', demosphere.members); // update the member list of everyone in the sphere 
          io.sockets.in('demosphere').emit('announcement', { msg: demouser + " joined the Sphere" }); // tell everyone who joined 
      } else{  // get all the users spheres and connect to them 
          console.log(user.spheres);
          if(user.spheres.length == 0){

              // if the user doesn't have a sphere create them one
              var sphere = new Sphere({name: user.name + "'s sphere", owner: user._id });
              // add user as sphere member
              sphere.members.push(user.name);
              sphere.save(function(err, sphere){
                if(err){ console.log("Error saving sphere"); }

                else{
                  socket.join(sphere.id);
                  socket.emit('announcement', {msg: "Welcome to your sphere!/nInvite 5 of your friends to share the web with!"});
                  socket.emit('users', sphere.members); 
                  user.spheres.push({object: sphere._id, username: user.name }); // add the sphere to user's sphere list 
                  user.save();
                  console.log(user.name + " and " + sphere.name + "sync'd");
                }
              }); 

          } else{
            // connect to all the users spheres 
            console.log(user.spheres)
            var sphereMap = {};        // hash of sphere names as keys that stores the sphere id and user's name for front end use

            for(var i = 0; i < user.spheres.length ; i++){
              socket.join(user.spheres[i].object.id);
              sphereMap[user.spheres[i].object.name] = {id: user.spheres[i].object._id, username: user.spheres[i].username};
            }

            // default sphere will be the users first sphere so send them that list of members
            socket.emit('users', user.spheres[0].object.members); 
            // pass the client side all the info necessary to track sphere related information 
            socket.emit('sphereMap', {sphereMap: sphereMap, index: 0});

           
          }
        }
  });

	 socket.on('send', function (data) {

      data.msg = parser(data.msg);
      console.log("emitted message");
      var messageData = "<p>" + data.sender + " (" + data.time + ")" + ": " + data.msg  + "</p>";
      messages.push(messageData);      // store the message info on the server
      console.log(messages);
  		io.sockets.emit('message', data);

  	});

   socket.on('createSphere', function(data){

      // find the user and make sure they're under the sphere limit 
      User.findOne({session: connection.sessionID}).populate('spheres.object').exec(function(err, user){

          if(err){console.log(err);}

          if(user){
            if(user.spheres.length < 5 ){
              // create the sphere 
              var sphere = new Sphere({name: data.sphereName, owner: user._id });
              // add user as sphere member
              sphere.members.push(user.name);
              sphere.save(function(err, sphere){
                if(err){ console.log("Error saving sphere"); }

                else{
                  socket.join(sphere.id);
                  socket.emit('clearChat');
                  socket.emit('announcement', {msg: "Welcome to your sphere " + user.name + "! Invite up to 5 more people to share the web with!"});
                  socket.emit('users', sphere.members); 
                   // pass the client side all the info necessary to track sphere related information 
                  user.spheres.push({object: sphere._id, username: user.name }); // add the sphere to user's sphere list 
      
                  /////////////////////////////////Modularize//////////////////////////////
                  var sphereMap = {};        // hash of sphere names as keys that stores the sphere id and user's name for front end use
                  for(var i = 0; i < user.spheres.length ; i++){
                    sphereMap[user.spheres[i].object.name] = {id: user.spheres[i].object._id, username: user.spheres[i].username};
                  }
                  //////////////////////////////////////////////////////////////////////////
                  socket.emit('sphereMap', {sphereMap: sphereMap, index: user.spheres.length}); //send the updated sphereMap new sphere should be the last in list
                  user.save();
                  console.log(user.name + " and " + sphere.name + "sync'd");
                }
              }); 
            }else{
              console.log("user has too many spheres");
            }
          } else{
            console.log("User not found");
          }
      });

    });


    socket.on('requestMessages', function(data, fillMessages){

        User.findOne({session: connection.sessionID}, function(err, user){
            if(err){console.log(err);}

            if(!user){
              console.log("Session and user don't match up");
            } else{


                var targetSphere = null;

                // check if the sphere at the given index has the same id as the sent id 
                if(user.spheres[data.sphereIndex].object == data.sphereID){
                  targetSphere = user.spheres[data.sphereIndex]; // if it does we have our sphere 
                } else{
                  // we have to go on a sphere hunt 
                  for(var i = 0; i < user.spheres.length; i++){
                     if(user.spheres[i].object == data.sphereID){
                        sphere = user.spheres[i];     
                     }
                  }
                }
               
                if(targetSphere){ // lets only do a query if we know the sphere exists 
                    // find the requested sphere with all its messages after the user joined the sphere 
                    Sphere.findOne({id: data.sphereID}).populate('messages', null, {date: {$gte: targetSphere.joined }}).exec(function(err, sphere){    
                      if(err){console.log(err);}

                      if(!sphere){
                        console.log("User requested a sphere that magically doesn't exist!");
                      } else{
                        console.log(sphere.messages);
                      }

                    });
                  }
                  console.log("Sphere: " + data.sphereID + " doesn't belong to user");
            }


        });

     //   fillMessages(messages);
      //  socket.emit('users', users);
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