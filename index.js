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
  if(ENV == 'production'){
      console.log("RUNNING ON PORT: " + process.env.PORT);
      console.log("rendering heroku bookmarklet");
      res.render("home");
  } else {
     res.render("dev_home");
  }    
});

app.get('/test.json', function(req, res){
  res.json(200, {data: "dummy data"});
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
  var url = "/bookmark/invite/" + inviteID;

  if(ENV == 'production'){
     url = "http://dropsphere.herokuapp.com/" + url;
     res.render("invite", {url: url});
  } else {
     url = "http://localhost:3500/" + url;
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

sessionSockets.on('connection', function (err, socket, session){
 
  console.log("Server connection created for socket: " + socket.id + " at " + moment().format("hh:mm:ssA") );

  var sessionID = session.id,
      socketID = socket.id,
      sphereMap = session.sphereMap,
      sphereIDs = session.sphereIDs, 
      contacts = session.contacts, 
      username = session.username,
      currentUser,
      mainSphere;

  if(clients[sessionID]){
    clients[sessionID].push(socketID);
  }else{
    clients[sessionID] = [socketID];
  }

  // get the current user object for this socket 
  User.load(sessionID, function(err, user, sphere){
    if(user){
      currentUser = user;
      mainSphere = sphere; 
    }
  });

  console.log("Joining Spheres..");

  for(var i = 0; i < sphereIDs.length; i++){
      var sphere = sphereIDs[i];
      sphere = String(sphere);
      socket.join(sphere);
      console.log(io.sockets.adapter.rooms);
      console.log("Joined " + sphere);
  }


 console.log("New to sphere? : " + session.newMember);
  // if the user has newly joined a sphere update the member list for everyone currently on
  if(session.newMember == true){  
      console.log("New sphere member..");
      var sphere = session.currentSphere; // the new sphere will be the last one on the list
      sphere = String(sphere);
      io.sockets.in(sphere).emit('users', {nicknames: session.nicknames, sphereID: sphere.id});
      socket.broadcast.to(sphere).emit('announcement', {msg: username +  " joined the sphere" });
      socket.broadcast.to(sphere).emit('addContact', {id: session.userID, name: username});
      console.log("User contacts: " + JSON.stringify(contacts));
      // socket.emit('updateContacts', contacts);
      session.newMember = false; 
  }


    socket.on('crawl', function(data, preview){
      var json; 
      try {
        json = JSON.parse(data);
      } catch (exception) {
        console.log("This isn't JSON");
      }

      if (json) {
        console.log("this is json");
      }

      console.log(data);
      console.log("Crawling Link: " + data);
      var url = data; 
      var wrappedLink; // url wrapped in html tags for output 
      var title;
      var thumbnail;
      var image = "";  
      var type; 
      var isImage = LinkParser.isImage(url);
      console.log(isImage);
      if(isImage){
          console.log("URL is Image..");
          type = "image";
          image = url;
          url = "";
          viewWrapped();
      }else{

        request(url, function(err, response, html){
          if (!err && response.statusCode == 200){
            console.log("URL crawled");
            var $ = cheerio.load(html);
            console.log("the html " + html);
            type = "link";
            title = $("title").text();
            thumbnail = $("meta[property='og:image']").attr('content') ||
                        $("meta[name='og:image']").attr('content');

            if(!thumbnail){
              thumbnail = "";
              console.log($('img'));
              $('img').each(function(index, img){
                    console.log(img);
                    var imgAttr = img.attribs;
                    if(imgAttr.height > 40 && imgAttr.width > 40){
                        thumbnail = imgAttr.src;
                        return false;
                      } 

                  });
                viewWrapped(); 
              }else{
                viewWrapped();
              }
          } else{
            console.log(err);
          }

        });

    } 


            function viewWrapped(){
              if(type === "image"){
                wrappedLink = LinkParser.tagWrap(image, type);
              }else{
                wrappedLink = LinkParser.tagWrap(url, type, title, thumbnail);
              }

              console.log("Image: " + image);
              console.log(title);
              console.log(wrappedLink);

              socket.emit('preview', {wrappedLink: wrappedLink, url: url, thumbnail: thumbnail, title: title, image: image});
            }

  });

  function isConnected(sphere){
    if(socket.rooms.indexOf(sphere) > 0){
      return true;
    }

    return false; 
  }

  socket.on('connectSocket', function(sphere){
      if(!isConnected(sphere)){
           socket.join(sphere);
           console.log("Joined " + sphere);
           User.reload(currentUser.id, function(user){
             if(user){
              currentUser = user; 
              console.log("reloaded current user: " + currentUser);
              console.log("reloaded user's sphere's: " + currentUser.spheres);
             }
           });
      }
      console.log(socket.rooms);
  });
  
  // if the posted content is a link
  socket.on('post', function(data){

      console.log(currentUser.name + " is posting URL..");
      
      // convert data sent as string to a hash if necessary (mobile)
      if(typeof data == 'string' || data instanceof String){
        LinkParser.hashMeBaby(data, function(data){
            saveAndEmit(data);
        });
      }else{
        saveAndEmit(data);
      }

      function saveAndEmit(data){      
          var sphereString = String(data.sphere).trim();       // we need the sphere id in string format for emitting 
          console.log("The sphere: " + sphereString);
          var sphereClients = Object.keys(io.sockets.adapter.rooms[sphereString]);        // get all the user connections in the sphere
          console.log("clients: " + sphereClients);
          data.time = moment().format("MMM Do, h:mm a");
        //  data.connected = isConnected(sphereString);

          var url = data.url || "",
              thumbnail = data.thumbnail || "",
              image = data.image || "",
              title = data.title;


          data.post = data.post || "<a href='#' class='textPost'>" + title + "</a>";



          if(url){
            data.isLink = true;
          }

          // emit a notification sound to all the clients in the sphere that aren't part of the current user's sessions
          for(var i = 0; i< sphereClients.length; i++){
                  if(clients[sessionID].indexOf(sphereClients[i]) === -1){
                    data.isOwner = false;
                    socket.broadcast.to(sphereClients[i]).emit('notifySound');
                  }else{
                    data.isOwner = true; 
                  }
          }

          var postInfo = {content: post, 
                          creator: {object: currentUser, name: data.sender}, 
                          contentData:{
                             url: url,
                             thumbnail: thumbnail,
                             image: image,
                             title: title
                            }
                          };

          var post = new Post(postInfo);

          Sphere.savePost(User, sphereString, post, function(savedPost){
              console.log("Post saved to sphere..." + savedPost);
              var postID = savedPost.id;
              data.postID = postID;
              socket.broadcast.to(sphereString).emit('post', data);
              socket.emit('getPostID', {postID : postID});
              session.posts[postID] = savedPost.getPostData(currentUser, sphereString);
              session.feed.unshift(postID);
              session.save();
              io.sockets.in(sphereString).emit('cachePost', {feed: session.feed, posts: session.posts, sphereID: data.sphere});
              console.log("Saved Session Data: " + JSON.stringify(session.posts[postID]) );
          });  
      }

  }); //end post


    
    socket.on('sendMessage', function(data){
      data.msg = LinkParser.tagWrap(data.msg, "msgLink");
      var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
      var sphereClients = Object.keys(io.sockets.adapter.rooms[sphereString]);        // get all the user connections in the sphere
      var messageData = "<p>" + data.sender + ": " + data.msg  + "</p>";

  	  io.sockets.in(sphereString).emit('message', data);

     // emit a notification sound to all the clients in the sphere that aren't part of the current user's sessions
      for(var i = 0; i< sphereClients.length; i++){
          if(clients[sessionID].indexOf(sphereClients[i]) === -1){
            socket.broadcast.to(sphereClients[i]).emit('notifySound');
          }
      } 


       Post.findOne({_id: data.postID}, function(err, post){
        if(post){
          console.log("sphere found")
          var message = new Message({text: data.msg, sender: data.sender});
          console.log(message);
    
          post.updatedChat(currentUser.id, sphereString); // update conversation notifier 

          message.save(function(err, msg){
            if(err){
              console.log(err);
            }

            if(msg){
              console.log("Message Saved: " + msg);
              post.addMessage(message, sphereString);
            }

          });

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

  socket.on('addToMain', function(postID){
    Post.findOne({_id:postID}, function(err, post){
      // only add if doesn't exist
      if(post && mainSphere.posts.indexOf(postID) < 0){
         // make a copy of the post wanting to be a saved so it has a unique reference 
          var postInfo = {content: post.content, 
                          creator: {object: currentUser, name: currentUser.name}, 
                          contentData:{
                             url: post.contentData.url,
                             thumbnail: post.contentData.thumbnail,
                             image: post.contentData.image,
                             title: post.contentData.title
                            }
                          };
                  var copiedPost = new Post(postInfo); 
                  copiedPost.save(function(err, post){
                    pushAndSave(post.id);
                  }); 

       function pushAndSave(){
          mainSphere.posts.push(post.id);
          mainSphere.save(function(err){
            if(!err){
              console.log("Post saved to sphere");

            }else{
              console.log(err);
            }
          });
        }

      }

    });
  });

  socket.on('sharePost', function(data){

        Post.findOne({_id: data.postID}, function(err, post){
           if(post){
              console.log("Post creator: " + post.creator.object);
               console.log("Post sharer: " + currentUser._id);
               // if the post creator and sharer are same, reference this post, otherwise make a copy
              if(post.creator.object != currentUser.id){
                    var postInfo = {content: post.content, 
                          creator: {object: currentUser, name: currentUser.name}, 
                          contentData:{
                             url: post.contentData.url,
                             thumbnail: post.contentData.thumbnail,
                             image: post.contentData.image,
                             title: post.contentData.title
                            }
                          };
                  var copiedPost = new Post(postInfo);
                  post = copiedPost; 

              }
              // save the post to the sphere and track the sphere from the post
              Sphere.savePost(currentUser, data.sphere, post, function(savedPost){
                console.log("Post saved to sphere..." + savedPost);
                var postID = savedPost.id;
                socket.emit('getPostID', {postID : postID});
                session.posts[postID] = savedPost.getPostData(currentUser, data.sphere);
                session.feed.unshift(postID);
                session.save();
                io.sockets.in(data.sphere).emit('cachePost', {feed: session.feed, posts: session.posts, sphereID: data.sphere});
                console.log("Saved Session Data: " + JSON.stringify(session.posts[postID]) );
              });

           }
        });
  });

  socket.on('viewedPost', function(data){
    console.log("Current User has viewed post: " + data.postID);


    Post.findOne({_id: data.postID}, function(err, post){
        if(post){
          console.log("Marking post as viewed by this user..");
          var sphereString = String(data.sphere);    
          post.viewedPost(currentUser.id, currentUser.name, sphereString);
          post.save(function(err, savedPost){
            if(savedPost){
              console.log("Post marked as viewed");
              data.viewers = savedPost.getViewed(savedPost.getViewers(sphereString));
              io.sockets.in(sphereString).emit('updateViewers', data);
              if(!session.posts[data.postID]){
                session.posts[data.postID] = savedPost.getPostData(currentUser, sphereString);
              }
              
              session.posts[data.postID]['viewers'] = data.viewers;
              io.sockets.in(sphereString).emit('cachePost', {feed: session.feed, posts: session.posts, sphereID: data.sphere});
              session.save();
            }
          });
        }
    }); 
  }); //end viewed post

  socket.on('editPost', function(data){
    console.log("Editing Post: " + data.postID);
    Post.update({_id: data.postID}, {'$set': {'contentData.title' : data.newtext}}, function(err, numAffected){
          if(err){console.log(err);}

          else{
            console.log(numAffected);
          }
    });
  
    session.posts[data.postID]['content']['title'] = data.newtext;
    session.save();

  });

  socket.on('deletePost', function(data){
    console.log("Deleting Post: " + data.postID);
    var sphereString = String(data.sphere);       // we need the sphere id in string format for emitting 
    Post.delete(data.postID, currentUser.id);
    delete session.posts[data.postID]
    session.feed.splice(session.feed.indexOf(data.postID), 1);
    session.save();
    io.sockets.in(sphereString).emit('removePost', {postID: data.postID});
    io.sockets.in(sphereString).emit('cachePost', {feed: session.feed, posts: session.posts, sphereID: data.sphere});
  });



  socket.on('updateSession', function(data){ 
    console.log("Updating Session Data..");
    session.posts[data.postID] = data.postData;
    session.feed.unshift(data.postID);
    console.log("Updated Feed: " + session.feed);
    session.save();
  });


  socket.on('seenChat', function(data){
    console.log("Conversation Seen by: " + currentUser.name );
    console.log(data.postID);
   
    Post.findOne({_id: data.postID}, function(err, post){
      if(post){
        console.log("Post Found")
        post.chatSeen(currentUser.id, data.sphereID);
        post.save(function(err, post){
          if(post){
            console.log("Saved Post...: " + post);

             if(!session.posts[data.postID]){
              session.posts[post.id] = post.getPostData(currentUser, data.sphereID);
              session.feed.push(post.id);
            }


            session.posts[data.postID].seen = true;
            console.log(session.posts[data.postID]);
            socket.emit('cachePost', {feed: session.feed, posts: session.posts, sphereID: data.sphereID});
            session.save();
          }
        });
      }
    });

    });

  // locates or creates a personal sphere between two users and renders it
  socket.on('personalSphere', function(userID){
      User.findOne({_id: userID}, function(err, user){
       if(user){
          console.log("Searching for personal sphere between users..");
          var sphere = Sphere.getPersonal(currentUser.id, userID, function(sphere){
          if(sphere){
            // gather and send the feed between the two users 
            console.log("Personal Sphere Exists");
            console.log(sphere);
            socket.emit('updateCurrent', sphere.id);
            sendFeed(sphere);

            console.log(io.sockets.adapter.rooms);
            io.sockets.in(user.mainSphere.id).emit('joinSphere', sphere.id);
          }else{
          // create a sphere between both users 
          console.log("No personal sphere found, creating one..");
        
              var members = [{id: currentUser.id, name:currentUser.name}, {id: user.id, name: user.name}];
              sphere = new Sphere({members: members, type:"Personal"});
              sphere.save(function(err, newSphere){
                if(newSphere){
                  console.log("Personal Sphere Created: " + newSphere);
                  newSphereMade(newSphere, currentUser, "Personal");
                  

                  user.spheres.push({object: sphere, nickname: user.name }); // add the sphere to user's sphere list 
                  user.save(function(err,user){
                    if(!err){
                      console.log("recipient spheres updated: " + user.spheres);
                      io.sockets.in(user.mainSphere).emit('joinSphere', sphere.id);
                    }
                  });
                }
              });
            }
          });
        }
      });
  });

   socket.on('createSphere', function(sphereName){
    console.log("Started sphere creation");
      // find the user and make sure they're under the sphere limit 
      User.findOne({sessions: {$in : [sessionID]}}).populate('spheres.object').exec(function(err, user){

          if(err){console.log(err);}

          if(user){
            
              // create the sphere 
              var sphere = new Sphere({name: sphereName, owner: user._id });
              // add user as sphere member
              sphere.members.push({id: user.id , name: user.name});
              sphere.save(function(err, sphere){
                if(err){ console.log("Error saving sphere"); }

                else{
                  newSphereMade(sphere,user,"Group");
                } 
              }); 
          
          } else{
            console.log("User not found");
          }
      });

    }); // end create sphere

   socket.on('deleteSphere', function(sphereID){
      console.log("Deleting Sphere.." + sphereID);
      Sphere.findOne({_id: sphereID}, function(err, sphere){

        if(sphere && (sphere.owner == currentUser.id) && !(sphere.isMain(currentUser.mainSphere))){
           console.log("User owns sphere");

           sphere.remove(function(err){
            if(err){
              console.log(err);
            }else{
              console.log("Sphere deleted");
              // remove sphere reference from all users
              User.deleteSphere(sphere.id);
              // remove sphere reference from all posts 
              Post.deleteSphere(sphere.id);

              //remove from sessions 
              var lostUpdates = session.sphereMap[sphereID].updates;
              session.totalUpdates -= lostUpdates; 
              session.sphereIDs.splice(session.sphereIDs.indexOf(sphereID), 1);
              delete session.sphereMap[sphereID];
              session.save();

            }
          }); 
        }
      })
   });

   socket.on('cacheSphere', function(sphere){
    console.log("Caching New Sphere..");
    Sphere.findOne({_id:sphere}, function(err,sphere){
      if(sphere){
        session.sphereMap[sphere.id] = {name: sphere.getName(currentUser.id),  nickname: username, link: sphere.link(ENV), updates: 1, type: sphere.type };
        session.sphereIDs.push(sphere.id);
        session.save();
        console.log(session.sphereMap);
        socket.emit("addSphereAndNotify", {map: session.sphereMap, sphere: sphere.id});
      }
    });
   });

  socket.on('requestUsers', function(data){
    console.log("Requesting users..");

      Sphere.findOne({_id: data.sphereID}, function(err, sphere){
          if(err|!sphere){ console.log("Error finding sphere");}

          else{
            socket.emit('users', {nicknames: sphere.nicknames, sphereID: sphere.id});
            session.nicknames = sphere.nicknames;
            session.save();
          }
      });
  }); // end request users 

  socket.on('requestFeed', function(data){
      console.log("Requesting Feed..");
 
      var targetSphere = null;
      var posts = {};
      var feed = [];
      console.log(currentUser.spheres);
      console.log(data.sphereIndex);
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
         Sphere.findOne({_id: data.sphereID}).populate('posts').exec(function(err, sphere){ 
           if(sphere){      

            // resets the notifications in a sphere to 0 once the user has accessed it 
            targetSphere.updates = 0;
            currentUser.currentSphere = data.sphereIndex;       
            sendFeed(sphere);
            currentUser.save(function(err){
              if(err){console.log(err);}

              else{
                console.log("user updates reset on requested sphere");
              }
            });

            //reset updates on sessions
            session.sphereMap[sphere.id].updates = 0;
            session.save();
            
           } else{
            console.log("User requested a sphere that magically doesn't exist!");
           }
         });
      }
  });

  socket.on('getPostConvo', function(data){
    var postID = data.postID;
    var sphereID = data.sphereID;

    Post.findOne({_id: postID}).populate('creator.object').exec(function(err, post){
      if(post){
        // if the user is the post sharer 
        if(post.creator.object == currentUser){
          // get all the conversations
          Message.populate(post, {path: 'shares.messages', model: 'Message'}, function(err, post){
            console.log(post.shares);
          }); 
        }else{  
          // just get the conversation at the requested sphere
          post.findShareByLoc(sphereID, function(share){
              if(share){
                Message.populate(share, {path: 'messages', model: 'Message'}, function(err, share){
                console.log(share);
                });
              }
          });

        }
      }
    });
 

}); // end getPostConvo

  socket.on('requestMessages', function(data, fillMessages){
      console.log("Requesting Messages..." + data.postID);

      var postID = data.postID;

      Post.findOne({_id: postID}, function(err, post){ 

        if(err){
          console.log(err);
        }

        if(post){


          console.log("Extracting Messages from Post.." + post);
          console.log("Sphere: " + data.sphereID);
          post.getLoc(data.sphereID, function(loc){
            console.log(loc);
            Message.populate(loc, {path:'messages'}, function(err, loc){
              var messages = loc.messages || [];

              var convo = {},
              key,
              currentMsg,
              msg1, 
              time1;

              // if theres only one message just display it
              if(messages.length == 1){
                currentMsg = messages[0];
                msg1 = [currentMsg.sender, currentMsg.text, currentMsg.isLink];
                time1 = moment(currentMsg.date);
                key =  time1.format();
                convo[key] = [msg1];
              }else{
                // otherwise loop through and sort the messages based on conversation time 
                for(var i = 0; i < messages.length - 1; i++ ){
                    currentMsg = messages[i];
                    msg1 = [currentMsg.sender, currentMsg.text, currentMsg.isLink];
                    time1 = moment(currentMsg.date);

                    // create a hash key for the date of the first message that points to an array, and store the message in the array
                    if(i == 0){
                      key =  time1.format();
                      convo[key] = [msg1];
                    }

                    if(messages.length > 1 && i < messages.length - 1){
                      var nextMsg = messages[i+1];
                      var msg2 = [nextMsg.sender, nextMsg.text, nextMsg.isLink];
                      var time2 = moment(nextMsg.date);

                      // compare each message to the one after it
                      if(time2.diff(time1, "minutes") <= 30 ){
                        // if the difference is less than or equal to 30 minutes between messages, store them in the same array under the last made hash key
                        convo[key].push(msg2);
                      }else{
                        // if the difference is greater than 30 minutes create a new hash key for the message date
                        key = time2.format();
                        convo[key] = [msg2];
                      }
                    }
                } 
              }

            console.log(convo);

            fillMessages(convo);
         
          });

        });
  
        }else{
          console.log("Couldn't obtain post");
        }
      });


  }); // end request messages 

  
  // sets the nickname of the user on all selected spheres
  socket.on('setNickname', function(data){
    console.log("Setting user's nickname..")
    var spheres = data.spheres; // selected spheres (array)
    var nickname = data.nickname; 


    console.log("Finding all selected spheres..");
    Sphere.find({$and: [{'members.id': currentUser.id}, {'_id': {$in: spheres}}]}, function(err, foundSpheres){

      if(!err && foundSpheres.length > 0){
        console.log(foundSpheres.length + " spheres found..");
        console.log("Adding nickname to each sphere..");
        // update the nickname on the user side and sphere side
        foundSpheres.forEach(function(sphere,index){
          currentUser.setNick(sphere.id, nickname);
          sphere.setNick(currentUser.id, nickname, function(updatedSphere){
            var nicknames = updatedSphere.nicknames;
            //  update every socket in the sphere
            io.sockets.in(sphere.id).emit('users', {nicknames: nicknames, sphereID: sphere.id});

            //update sessions if needed
            if(session.currentSphere == updatedSphere.id){
              console.log("Updating session info with new nickname..");
              session.nickname = nickname;
              session.nicknames = nicknames;
              session.save();
            }

            // save the user data at the end 
            if(index == foundSpheres.length -1){
              currentUser.save();

              //emit a success message 
              socket.emit('nicknameSuccess', {spheres: spheres, nickname:nickname});
            }

          });

        });
      }


    });
  });


  socket.on('leaveRooms', function(data){
    console.log("ending session");
    currentUser.endSession(sessionID);
    console.log("leaving  rooms");
    var spheres = data.spheres;
    console.log(spheres);

    for(var i = 0; i < spheres.length; i++){

        var sphereID = spheres[i];
        console.log(sphereID);
        socket.leave((String(sphereID)));
    }
  });


  function newSphereMade(sphere, user, type){
          socket.join(sphere.id);
          socket.emit('clearChat');
          socket.emit('users', {nickanmes: sphere.nicknames, sphereID: sphere.id}); 
          // pass the client side all the info necessary to track sphere related information 
          user.spheres.push({object: sphere, nickname: user.name }); // add the sphere to user's sphere list 

          var addedSphere =  user.spheres[user.spheres.length - 1];
          var link = (sphere.type === "Group" ? addedSphere.object.link(ENV) : "");

          var sphereID = (addedSphere.object._id) ? addedSphere.object._id : addedSphere.object;     
          var isOwner = sphere.owner == currentUser.id;

          var sphereName = sphere.getName(user.id);
          session.sphereMap[sphereID] = { name: sphereName, 
                                             nickname: addedSphere.nickname, 
                                             link: link,
                                             updates: addedSphere.updates,        
                                             type: sphere.type,
                                             isOwner: isOwner
                                          };

                  session.sphereIDs.push(sphereID);
                  session.nicknames = sphere.nicknames;
                  session.currentSphere = sphereID;
                  session.messages = {};
                  session.nickname = user.name;

                  socket.emit('newSphere', {sphereMap: session.sphereMap, sphereIDs: session.sphereIDs, currentSphere: session.currentSphere });
                
                  console.log(session);

                  session.save();

                  user.save();
                  console.log(user.name + " and " + sphere.getName(user.id) + "sync'd");   

  }

  function sendFeed(sphere){
      var posts = {};
      var feed = [];

      for(var i = sphere.posts.length - 1; i > -1 ; i--){
          var currentPost = sphere.posts[i];
          var post = currentPost.getPostData(currentUser, sphere.id);
          var key = currentPost.id;

          posts[key] = post;
          feed.push(key);
      }

      console.log(feed);

      socket.emit('updateAndView', {feed: feed, posts: posts, sphereID: sphere.id});

      // update the currentSphere session info 
      session.currentSphere = sphere.id; 
      session.feed = feed;    
      session.posts = posts;
      session.save();

  }



}); // end connection 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


