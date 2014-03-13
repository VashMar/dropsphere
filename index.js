var express = require("express");
var cookie = require("cookie");
var sass = require("node-sass");
var moment = require("moment");
var email = require("emailjs/email");

// load URI.js
var URI = require('URIjs');

// models 
var mongoose = require("mongoose"),
    User     = require("./models/user"),
    Sphere   = require("./models/sphere"),
    Demosphere = require("./models/demo_sphere"),
    Message   = require("./models/message");
    Post      = require("./models/post");

//controllers 
var chat = require("./controllers/chat");

var COOKIE_SECRET = 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB';
var cookieParser = express.cookieParser(COOKIE_SECRET);
var EXPRESS_SID_KEY = 't3stk3y';

var app = express();
var sessionStore = new express.session.MemoryStore();
var port = process.env.PORT || 3500; 
// connect websockets to our server 
var io = require('socket.io').listen(app.listen(port));

var SessionSockets = require('session.socket.io'),
    sessionSockets = new SessionSockets(io, sessionStore, cookieParser, EXPRESS_SID_KEY); 


var ENV = process.env.NODE_ENV;

var database = process.env.MONGOLAB_URI || 
               process.env.MONGOHQ_URL  ||
               "mongodb://localhost:27017/dropsphere_dev";

// db connection
mongoose.connect(database, function(err, res){
  if(err){console.log('ERROR connecting to: ' + database + ': ' + err + "in " + ENV);}

  else{
    console.log("Connection to " + database + " successful in " + ENV);
  }
});

// demosphere for users testing the product 
demosphere = new Demosphere();

app.locals.moment = require('moment');

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

 /*   app.use(express.session({
      store : new RedisStore({
        host: 'localhost',
        port: 6380

      })
      secret: 'Dr0p5ph3r3z'
    })); */



    app.use(express.session({
      store : sessionStore,
      key   : EXPRESS_SID_KEY,
      cookie: {httpOnly: true}
    })); 

    app.use(express.static(__dirname + '/public'));
    app.use(express.urlencoded());
    app.use(express.json());
    app.set('views', __dirname + '/layouts');
    app.set('view engine', "jade");
    app.engine('jade', require('jade').__express);

});



// Routing -- Move to router file eventually //////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/", function(req, res){
  console.log("ENVIRONMENT IS: " + ENV);
  console.log(ENV == 'production');
  if(ENV == 'production'){
      console.log("rendering heroku bookmarklet");
      res.render("home");
  } else {
     res.render("dev_home");
  }    
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

app.post('/login', chat.login);

app.get('/bookmark', chat.bookmark);

app.get('/logout', chat.logout);

// issue sign up form
app.get('/join', function(req, res){
     res.render("includes/join");
});

app.post('/signup', chat.signup);


app.get("/invite/:id", function(req, res){
  var inviteID = req.param('id');
  var url = "bookmark/invite/" + inviteID;

  if(ENV == 'production'){
     res.render("invite", {url: url});
  } else {
     res.render("dev_invite", {url: url});
  }
});

app.get("/bookmark/invite/:id", chat.invite);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



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


clients = {}; // tracks sessions and associated sockets 

sessionSockets.on('connection', function (err, socket, session) {
 
  console.log("Server connection created for socket: " + socket.id + "at " + moment().format("hh:mm:ssA") );

  var sessionID = session.id;
  var socketID = socket.id;
  var sphereMap = session.sphereMap;
  var sphereNames = session.sphereNames;  
  var nickname = session.nickname;

  if(clients[sessionID]){
    clients[sessionID].push(socketID);
  }else{
    clients[sessionID] = [socketID];
  }



  console.log("Joining Spheres..");

  for(var i = 0; i < sphereNames.length; i++){
      var sphere = sphereMap[sphereNames[i]].id;
      sphere = String(sphere);
      socket.join(sphere);
      console.log("Joined " + sphere);
  }



  // if the user has newly joined a sphere update the member list for everyone currently on
  if(session.newMember == true){  
      var sphere = sphereMap[sphereNames[sphereNames.length - 1]].id; // the new sphere will be the last one on the list
      sphere = String(sphere);
      io.sockets.in(sphere).emit('users', session.nicknames);
      socket.broadcast.to(sphere).emit('announcement', {msg: nickname +  " joined the sphere" });
      session.newMember = false; 
  }

/*var sphereMap = {};        // hash of sphere names as keys that stores the sphere id and user's name for front end use
  var index = 0;      // used to track which sphere user logins in to first (0 by default for main sphere)
  var totalUpdates = 0; // total number of sphere notifications for user 

  // on connection find out who the user is using the sessionID;
  User.findOne({session: sessionID}).populate('spheres.object').exec(function(err, user){

      if(err){console.log(err);}

      // if there was no user found then the session is a demo plop them in the demosphere
      if(!user){
          var demouser = sessionData.username;
          demosphere.members.push(demouser); 
          console.log(demouser + " added to demosphere");
          socket.join('demosphere');
          io.sockets.in('demosphere').emit('users', demosphere.members); // update the member list of everyone in the sphere 
          io.sockets.in('demosphere').emit('announcement', { msg: demouser + " joined the Sphere" }); // tell everyone who joined 
      } else{  // get all the users spheres and connect to them 
          index = user.currentSphere;

          if(user.spheres.length == 0){

              // if the user doesn't have a sphere create them one
              var sphere = new Sphere({name: user.name + "'s sphere", owner: user._id });
              // add user as sphere member
              sphere.members.push({id: user.id , name: user.name});
              sphere.save(function(err, sphere){
                if(err || !sphere){ console.log("Error saving sphere"); }

                else{
                  socket.join(sphere.id);
                  sphereMap[sphere.name] = {id: sphere._id, nickname: user.name, link: sphere.link(ENV) , updates: 0}; // build a sphereMap for the client 
                  socket.emit('users', sphere.nicknames); 


                  // pass the client side all the info necessary to track sphere related information 
                  socket.emit('sphereMap', {sphereMap: sphereMap, index: index, justmade: true, totalUpdates: totalUpdates});

                  socket.emit('announcement', {msg: "Welcome to your sphere!<br/> <a href='#' data-toggle='modal' data-target='#shareModal'> Invite </a>  whomever you deem worthy to the group "});

                  user.spheres.push({object: sphere, nickname: user.name }); // add the sphere to user's sphere list 
                  user.save();
                  console.log(user.name + " and " + sphere.name + "sync'd");
                }
              }); 

          } else{
           
          
           
            for(var i = 0; i < user.spheres.length ; i++){
               //makes sure the user first lands in the invite sphere 
              if(sessionData.invite == true && sessionData.inviteID == user.spheres[i].object.id){
                  console.log("user responding to invitation");
                  index = i; 
                  sessionData.invite = false; // the invite has been handled 


              }

              socket.join(user.spheres[i].object.id);  // connect to all the users spheres 

              totalUpdates += user.spheres[i].updates;

              console.log(user.spheres[i].updates);
              // build the spheremap of the users spheres 
              sphereMap[user.spheres[i].object.name] = {id: user.spheres[i].object._id, 
                                                        nickname: user.spheres[i].nickname, 
                                                        link: user.spheres[i].object.link(ENV),
                                                        updates: user.spheres[i].updates
                                                      };

            }

            // default sphere will be the users first sphere so send them that list of members
            socket.emit('users', user.spheres[index].object.nicknames); 
          
            // pass the client side all the info necessary to track sphere related information 
            socket.emit('sphereMap', {sphereMap: sphereMap, index: index, totalUpdates: totalUpdates});     

          if(sessionData.justAdded == true){
            io.sockets.in(user.spheres[index].object.id).emit('announcement', {msg: userSphere.nickname + " joined the sphere"}); 
            socket.broadcast.to(user.spheres[index].object.id).emit('users',  user.spheres[index].object.nicknames) //emit to 'room' except this socket
            sessionData.justAdded == false
          }

          }
        }
  }); */

    socket.on('post', function(data){
      data.msg = linkParser(data.msg);
      var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
      var sphereClients = io.sockets.clients(sphereString);        // get all the user connections in the sphere 
      var messageData = "<p>" + data.sender + ": " + data.msg  + "</p>";


    });
    
    socket.on('send', function (data) {

      data.msg = linkParser(data.msg);
      var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
      var sphereClients = io.sockets.clients(sphereString);        // get all the user connections in the sphere 
      var messageData = "<p>" + data.sender + ": " + data.msg  + "</p>";

  	  io.sockets.in(sphereString).emit('message', data);

      // emit a notification sound to all the clients in the sphere that aren't part of the current user's sessions
      for(var i = 0; i< sphereClients.length; i++){
        if(clients[sessionID].indexOf(sphereClients[i].id) === -1){
          console.log(sphereClients[i].id);
          sphereClients[i].emit('notifySound');
        }
      }

       Sphere.findOne({_id: data.sphere}, function(err, sphere){
        if(sphere){
          console.log("sphere found")
          var message = new Message({text: data.msg, sender: data.sender});
          console.log(message);
          //clean up code /////////////////////////////////////////////////////////////////////////////////////////////////
          message.save(function(err, msg){
            if(err){
              console.log(err);
            }

            if(msg){
              console.log("Message Saved: " + msg);
            }
          });
          sphere.messages.push(message);
          sphere.save(function(err, sphere){
            console.log(sphere.messages.length);

          });

          for(var i = 0; i < sphere.members.length; i++){
             var member = sphere.members[i].id;
              User.update({$and: [{_id: member} , {'spheres.object': sphere._id}]}, {'$inc': {'spheres.$.updates' : 1}}, function(err){
                  if(err){console.log(err);}
                  else{
                    console.log("notifications updated");
                  }
              });
          } 
        }
      });

  	}); // end send 

  socket.on('seen', function(data){
    User.update({$and: [{session: sessionID} , {'spheres.object': data.sphere}]}, {'$inc': {'spheres.$.updates' : -1}}, function(err){
          if(err){console.log(err);}

          else{
            console.log("message seen");
          }
    });
  }); // end seen  

   socket.on('createSphere', function(data, sphereMap){
    console.log("Started sphere creation");
      // find the user and make sure they're under the sphere limit 
      User.findOne({session: sessionID}).populate('spheres.object').exec(function(err, user){

          if(err){console.log(err);}

          if(user){
            if(user.spheres.length < 6){
              // create the sphere 
              var sphere = new Sphere({name: data.sphereName, owner: user._id });
              // add user as sphere member
              sphere.members.push({id: user.id , name: user.name});
              sphere.save(function(err, sphere){
                if(err){ console.log("Error saving sphere"); }

                else{
                  socket.join(sphere.id);
                  socket.emit('clearChat');
                  socket.emit('announcement', {msg: "Welcome to " + sphere.name + "!<br/> <a href='#' data-toggle='modal' data-target='#shareModal'> Invite </a> your friends and start sharing the web!"});
                  socket.emit('users', sphere.nicknames); 
                   // pass the client side all the info necessary to track sphere related information 
                  user.spheres.push({object: sphere, nickname: user.name }); // add the sphere to user's sphere list 

                  var addedSphere =  user.spheres[user.spheres.length - 1];

               

                  session.sphereMap[sphere.name] = { id: addedSphere.object._id, 
                                                     nickname: addedSphere.nickname, 
                                                     link: addedSphere.object.link(ENV),
                                                     updates: addedSphere.updates          
                                                    };

                  session.sphereNames.push(sphere.name);

                  sphereMap(session.sphereMap);
                  session.nicknames = sphere.nicknames;
                  session.currentSphere = sphere.name;
                  session.messages = {};
                  session.nickname = user.name;
                  console.log(session);

                  session.save();

                  user.save();
                  console.log(user.name + " and " + sphere.name + "sync'd");
                }
              }); 
            }else{
              socket.emit("chatError", "You've reached the 5 sphere limit! Delete a sphere to create a new one.");
            }
          } else{
            console.log("User not found");
          }
      });

    }); // end create sphere


  socket.on('requestUsers', function(data){
    console.log("Requesting users..");

      Sphere.findOne({_id: data.sphereID}, function(err, sphere){
          if(err|!sphere){ console.log("Error finding sphere");}

          else{
            socket.emit('users', sphere.nicknames);
            session.nicknames = sphere.nicknames;
            session.save();
          }
      });
  }); // end request users 


  socket.on('requestMessages', function(data, fillMessages){
      console.log("Requesting Messages...");
        User.findOne({session: sessionID}, function(err, user){
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

                    Sphere.findOne({_id: data.sphereID}).populate('messages', null, {date: {$gte: targetSphere.joined }}).exec(function(err, sphere){    
                      if(err){console.log(err);}

                      if(!sphere){
                        console.log("User requested a sphere that magically doesn't exist!");
                      } else{
                        console.log(sphere.messages[sphere.messages.length - 1]);
                        var messages = {};
                        var key; 
                        for(var i = 0; i <= sphere.messages.length - 1; i++){
                            
                            var msg1 = [sphere.messages[i].sender, sphere.messages[i].text, sphere.messages[i].isLink];
                            var time1 = moment(sphere.messages[i].date);

                            // create a hash key for the date of the first message that points to an array, and store the message in the array
                            if(i == 0){
                              key =  time1.format();
                              messages[key] = [msg1];
                            }

                            if( sphere.messages.length > 1 && i < sphere.messages.length - 1){
                              var msg2 = [sphere.messages[i+1].sender, sphere.messages[i+1].text, sphere.messages[i+1].isLink];
                              var time2 = moment(sphere.messages[i+1].date);

                              // compare each message to the one after it
                              if(time2.diff(time1, "minutes") <= 30 ){
                                // if the difference is less than or equal to 30 minutes between messages, store them in the same array under the last made hash key
                                messages[key].push(msg2);
                              }else{
                                // if the difference is greater than 30 minutes create a new hash key for the message date
                                key = time2.format();
                                messages[key] = [msg2];
                              }
                            }
                        } // end for 

                        console.log(messages);
                        //  send the hash back for the front end to make sense of 
                        fillMessages(messages);

                        // resets the notifcations in a sphere to 0 once the user has accessed it 
                        targetSphere.updates = 0;
                        user.currentSphere = data.sphereIndex;

                        // update the currentSphere session info 
                        session.currentSphere = sphere.name;     
                        session.messages = messages;
                        session.save();

                        user.save(function(err){
                          if(err){console.log(err);}

                          else{
                            console.log("user updates reset on requested sphere");
                          }

                        });

                      }

                    }); // end sphere hunt

                  }else{
                      socket.emit("chatError", "It seems you're not a member of this sphere..");
                  }
                 
            }


        }); // end user hunt 

  
  }); // end request messages 




  socket.on('changeName', function(data){
    console.log("Changing Name...");
      console.log("Name: " + data.newName + " sphereWide: " + data.sphereWide);

      var newName = data.newName,
          sphereWide = data.sphereWide,
          sphereIndex = data.sphereIndex;

      User.findOne({session: sessionID}).populate('spheres.object').exec(function(err, user){

        if( err || !user){ console.log("Couldn't find user");}

        else{
           // if the change is sphere wide update the name of the user and the name in every sphere 
           if(sphereWide == true){

             Sphere.update({'members.id': user.id}, {'$set': {'members.$.name' : newName}}, {multi:true}, function(err){
                  if(err){console.log(err);}
              });

              for(var i = 0; i < user.spheres.length; i++){
                  var userSphere = user.spheres[i];
                  // if the sphere nickname is the username, update it 
                  if(userSphere.nickname == user.name){
                      userSphere.nickname = newName;
                  }

              }
                
              user.name = newName; 

              user.save(function(err){
                  if(err){console.log(err);}
                  else{
                    console.log("User: " + user.id + " now known as " + user.name);
                    console.log(user.spheres);
                  } 
              });

           } else{
              // otherwise only change the nickname pertaining to the user's current sphere 
              var userSphere = user.spheres[sphereIndex];

              // swap the current user nickname is the sphere members list with the new one 
              Sphere.update({$and: [{_id: userSphere.object.id} , {'members.id': user.id}]}, {'$set': {'members.$.nickname' : newName}}, function(err){
                  if(err){console.log(err);}
              });

              io.sockets.in(userSphere.object.id).emit('announcement', {msg: userSphere.nickname + " is now known as " + newName});


              userSphere.nickname = newName; // change the nickname to the new name 
        

              user.save(function(err){
                  if(err){console.log(err);}
                  else{ console.log("User nickname in sphere: " + userSphere.object.id + "is now " + userSphere.nickname)}
              });
           }

        }

      });
 
  });


  socket.on('leaveRooms', function(data){
    console.log("leaving  rooms");
    var spheres = data.spheres;
    console.log(spheres);

    for(var i = 0; i < spheres.length; i++){

        var sphereID = spheres[i];
        console.log(sphereID);
        socket.leave((String(sphereID)));
    }
  });

}); // end connection 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



// parser to discover if the post or message contains a link 
 function linkParser(msg) { 
    var res = msg;
    var hasProtocol = msg.indexOf("http://") > -1;

    if( hasProtocol || msg.indexOf("www.") > -1  ){
      if(msg.indexOf("http://www.youtube.com/watch?") > -1 || msg.indexOf("www.youtube.com/watch?") > -1){
        var video = msg.split('v=')[1];

        if(video.indexOf('&') > -1){
          video = video.split('&')[0];
        }

        res = "<iframe width='250' height='200' frameborder='0' src='//www.youtube.com/embed/" + video + "' allowfullscreen></iframe>";
      }else{

       res = "<a target='_blank' href='";

        if(hasProtocol){
          var suffix = /[^.]+$/.exec(msg);

          if(suffix == "jpg" || suffix == "jpeg" || suffix == "gif" || suffix == "png"){
            res += msg +"'>" ;
            msg = "<img style='max-width:200px; max-height: 200px;' src='" + msg + "'/>";

          }else{
            res += msg +"'>" ;
            msg = msg.substr(7);
           } 

        }else{
          res += "http://"+ msg +"'>" ;
          msg = msg.substr(4);
        }  
         res += msg + "</a>";
      } 
    }
    res = res.replace(/\n/g, '<br />');
    return res;

 }