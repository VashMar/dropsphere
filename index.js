var express = require("express");
var cookie = require("cookie");
var sass = require("node-sass");
var moment = require("moment");
var email = require("emailjs/email");


// models 
var mongoose = require("mongoose"),
    User     = require("./models/user"),
    Sphere   = require("./models/sphere"),
    Demosphere = require("./models/demo_sphere"),
    Message   = require("./models/message");
    Post      = require("./models/post");



//controllers 
var Feed = require("./controllers/feed");

var LinkParser = require("./helpers/link_parser");

var request = require('request');
var cheerio = require('cheerio');


var Crawler = require("crawler").Crawler;
var crawl = new Crawler({"maxConnections":10});

var COOKIE_SECRET = 'MCswDQYJKoZIhvcNAQEBBQADGgAwFwIQBiPdqpkw/I+tvLWBqT/h3QIDAQAB';
var cookieParser = express.cookieParser(COOKIE_SECRET);
var EXPRESS_SID_KEY = 't3stk3y';

var app = express();
var sessionStore = new express.session.MemoryStore();
console.log("RUNNING ON PORT: " + process.env.PORT);
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

app.post('/login', Feed.login);

app.get('/bookmark', Feed.bookmark);

app.get('/logout', Feed.logout);

// issue sign up form
app.get('/join', function(req, res){
     res.render("includes/join");
});

app.post('/signup', Feed.signup);


app.get("/invite/:id", function(req, res){
  var inviteID = req.param('id');
  var url = "bookmark/invite/" + inviteID;

  if(ENV == 'production'){
     res.render("invite", {url: url});
  } else {
     res.render("dev_invite", {url: url});
  }
});

app.get("/bookmark/invite/:id", Feed.invite);


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
  var currentUser;

  if(clients[sessionID]){
    clients[sessionID].push(socketID);
  }else{
    clients[sessionID] = [socketID];
  }

  // get the current user object for this socket 
  User.load(sessionID, function(err, user){
    if(user){
      currentUser = user;
    }
  });

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


    socket.on('crawl', function(data, preview){
      console.log("Crawling Link: " + data.url);
      var url = data.url; 
      console.log(url);
      var isImage = LinkParser.isImage(url);
      var type; 

      if(isImage){
          console.log("URL is Image..");
          type = "image";
          url = LinkParser.tagWrap(url, type);
          console.log(url);
          preview(url);
      }else{

        request(url, function(err, response, html){
          if (!err && response.statusCode == 200){
            var $ = cheerio.load(html);

            type = "link";
            var title = $("title").text();
            var image = $("meta[property='og:image']").attr('content') ||
                        $("meta[name='og:image']").attr('content');

            if(!image){
              console.log($('img'));
              $('img').each(function(index, img){
                    console.log(img);
                    var imgAttr = img.attribs;
                    if(imgAttr.height > 40 && imgAttr.width > 40){
                        image = imgAttr.src;
                        return;
                      } 
                  });
              }

        
            console.log("Image: " + image);
            console.log(title);
            url = LinkParser.tagWrap(url, type, title, image);
            console.log(url);
            preview(url);

          }
        });

    } 


    });


    socket.on('postURL', function(data, returnID){
      console.log(currentUser.name + " is posting URL..");
      console.log("Sender: " + data.sender);
      var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
      var sphereClients = io.sockets.clients(sphereString);        // get all the user connections in the sphere
      var time = moment().format();

      // emit a notification sound to all the clients in the sphere that aren't part of the current user's sessions
      for(var i = 0; i< sphereClients.length; i++){
              if(clients[sessionID].indexOf(sphereClients[i].id) === -1){
                console.log(sphereClients[i].id);
                sphereClients[i].emit('notifySound');
              }
      } 

      data.isLink = true;
      data.timeFormatted = time;

      socket.broadcast.to(sphereString).emit('post', data);
      var post = new Post({content: data.post, creator: {object: currentUser, name: data.sender}});
      Sphere.savePost(User, data.sphere, post, function(savedPost){
          returnID(savedPost.id);

          session.posts[time] = savedPost.getPostData(currentUser);
          session.feed.unshift(time);
          session.save();
          io.sockets.in(sphereString).emit('cachePost', {feed: session.feed, posts: session.posts});
          console.log("Saved Session Data: " + session.posts);
      });
    });



    socket.on('post', function(data){
      console.log("Posting Data..");

      var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
      var sphereClients = io.sockets.clients(sphereString);        // get all the user connections in the sphere
      var type;   // type of post 
      var url = LinkParser.getURL(data.post);
      console.log("Post URL: " + url);
      if(url){

         var isImage = LinkParser.isImage(url);

         if(isImage){
          type = "image";
          data.post = LinkParser.tagWrap(data.post, type);
          console.log(data.post);
         }else{
    
          crawl.queue([{
            "uri": url,
            "callback":function(error,result,$){
              if(error){
                console.log(error);
              }else{

              type = "link";
              var title = $("title").text();
              var description = $("meta[property='og:description']").attr('content') || 
                                $("meta[name='og:description']").attr('content') || 
                                $("meta[name='description']").attr('content');
              var image = $("meta[property='og:image']").attr('content') ||
                          $("meta[name='og:image']").attr('content');


              console.log("Image: " + image.length);
              console.log(title);
              data.post = LinkParser.tagWrap(data.post, type, title, description, image);
              console.log(data.post);
              emitAndSave();
              }
      
            } 
          }]);
        }
      }
          

      console.log("Non Link Post.."); 
      emitAndSave(); 

  
     
     function emitAndSave(){

        // emit a notification sound to all the clients in the sphere that aren't part of the current user's sessions
        for(var i = 0; i< sphereClients.length; i++){
              if(clients[sessionID].indexOf(sphereClients[i].id) === -1){
                console.log(sphereClients[i].id);
                sphereClients[i].emit('notifySound');
              }
        } 


           io.sockets.in(sphereString).emit('post', data);
           var post = new Post({content: data.post, creator: {object: currentUser, name: data.sender}});
           Sphere.savePost(User, data.sphere, post, function(savedPost){
              console.log("Saved Post: " + savedPost);
              console.log("Current User: " + currentUser.id);
              var time = moment().format();
              session.posts[time] = [savedPost.creatorName(), savedPost.content, currentUser.isOwner(savedPost), savedPost.isLink, savedPost.id];
              session.feed.unshift(time);
              session.save();
           });
     }
  

    }); // end post 
    
    socket.on('send', function(data) {
      data.msg = LinkParser.tagWrap(data.msg, "msgLink");
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

       Post.findOne({_id: data.postID}, function(err, post){
        if(post){
          console.log("sphere found")
          var message = new Message({text: data.msg, sender: data.sender});
          console.log(message);
    
          post.updatedConvo(currentUser.id); // update conversation notifier 

          message.save(function(err, msg){
            if(err){
              console.log(err);
            }

            if(msg){
              console.log("Message Saved: " + msg);

              post.messages.push(message);
              post.save(function(err, sphere){
                console.log(sphere.messages.length);
              });
            }

          });

       /*  for(var i = 0; i < sphere.members.length; i++){
             var member = sphere.members[i].id;
              User.update({$and: [{_id: member} , {'spheres.object': sphere._id}]}, {'$inc': {'spheres.$.updates' : 1}}, function(err){
                  if(err){console.log(err);}
                  else{
                    console.log("notifications updated");
                  }
              });
          } */
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

  socket.on('updateSession', function(data){
    console.log("Updating Session Data..");
    console.log(data.time);
    console.log(currentUser.name);
    session.posts[data.time] = data.postData;
    session.feed.unshift(data.time);
    console.log("Updated Feed: " + session.feed);
    session.save();
  });


  socket.on('seenConvo', function(data){
    console.log("Conversation Seen by: " + currentUser.name );
    Post.seenConvo(data.postID, currentUser.id);
    session.posts[data.time][5] = true;
    session.save();
  });

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


  socket.on('requestFeed', function(data, fillFeed){
      console.log("Requesting Feed..");
 
      var targetSphere = null;
      var posts = {};
      var feed = [];
      if(currentUser.spheres[data.sphereIndex].object == data.sphereID){
        targetSphere = currentUser.spheres[data.sphereIndex];
      } else{
          for(var i = 0; i < currentUser.spheres.length; i++){
              if(currentUser.spheres[i].object == data.sphereID){
                  sphere = currentUser.spheres[i];     
              }
          }
      }

 

      if(targetSphere){
         console.log("Retrieving posts from Sphere: " + targetSphere + "..");
         Sphere.findOne({_id: data.sphereID}).populate('posts', null, {date: {$gte: targetSphere.joined }}).exec(function(err, sphere){ 
           if(sphere){             

               for(var i = sphere.posts.length - 1; i > -1 ; i--){
                  var currentPost = sphere.posts[i];
                  var post = currentPost.getPostData(currentUser);
                  var time = moment(sphere.posts[i].date);
                  var key = time.format();

                  posts[key] = post;
                  feed.push(key);
              }

              console.log(feed);

              fillFeed(posts, feed);

              // resets the notifications in a sphere to 0 once the user has accessed it 
              targetSphere.updates = 0;
              currentUser.currentSphere = data.sphereIndex;

              // update the currentSphere session info 
              session.currentSphere = sphere.name; 
              session.feed = feed;    
              session.posts = posts;
              session.save();

              currentUser.save(function(err){
                  if(err){console.log(err);}

                  else{
                    console.log("user updates reset on requested sphere");
                  }
              });
           } else{
            console.log("User requested a sphere that magically doesn't exist!");
           }
         });
      }


  });


  socket.on('requestMessages', function(data, fillMessages){
      console.log("Requesting Messages...");
      
      var postID = data.postID;
      var joined = currentUser.joinedCurrent();

      Post.findOne({_id: postID}).populate('messages', null, {date: {$gte: joined }}).exec(function(err, post){ 

        if(err){
          console.log(err);
        }

        if(post){

          console.log("Extracting Messages from Post..");
          var messages = {},
              key,
              currentMsg,
              msg1, 
              time1;

    /*      for(var i = posts.messages.length - 1; i > -1 ; i--){

            var currentMsg = post.messages[i];
            var msg1 = [currentMsg.sender, currentMsg.text, currentMsg.isLink];
            var time1 = moment(currentMsg.date);


          } */

          // if theres only one message just display it
          if(post.messages.length == 1){
            currentMsg = post.messages[0];
            msg1 = [currentMsg.sender, currentMsg.text, currentMsg.isLink];
            time1 = moment(currentMsg.date);
            key =  time1.format();
            messages[key] = [msg1];
          }else{
            // otherwise loop through and sort the messages based on conversation time 
            for(var i = 0; i < post.messages.length - 1; i++ ){
                currentMsg = post.messages[i];
                msg1 = [currentMsg.sender, currentMsg.text, currentMsg.isLink];
                time1 = moment(currentMsg.date);

                // create a hash key for the date of the first message that points to an array, and store the message in the array
                if(i == 0){
                  key =  time1.format();
                  messages[key] = [msg1];
                }

                if(post.messages.length > 1 && i < post.messages.length - 1){
                  var nextMsg = post.messages[i+1];
                  var msg2 = [nextMsg.sender, nextMsg.text, nextMsg.isLink];
                  var time2 = moment(nextMsg.date);

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
            } 
          }

          console.log(messages);

          fillMessages(messages);

        }else{
          console.log("Couldn't obtain post");
        }
      });


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


