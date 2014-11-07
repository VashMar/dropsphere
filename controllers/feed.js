
var mongoose = require("mongoose"),
    User     = require("../models/user"),
    Sphere 	 = require("../models/sphere");

var crypto = require('crypto');

var moment = require("moment");
var ENV = process.env.NODE_ENV;


var Session = require("../controllers/sessions");

var Mailer = require("../helpers/mailer");

var baseURL = (ENV == "production") ? "https://dropsphere.herokuapp.com/" : "http://localhost:3500/";

// show action
exports.bookmark = function(req, res, cookie){
  var sesh = req.session;
  var email = req.cookies.email; // persistent cookie session 
  
  console.log("Bookmarklet launching.." + JSON.stringify(sesh));

	if(sesh.isLogged == true){ 
      Session.render(res, "template_feed", sesh);
  }else if(email){
    User.findOne({email: email}).populate('spheres.object contacts requests').exec(function(err, user){
      retrieveSessionData(user, req, res, "template_feed");
    });
  }else{
    Session.render(res, "template_login");
  }
}

// create action 
exports.signup = function(req, res){
 
	console.log("signing up user with credentials: " + req.body);

   	// get parameters 
    var name = req.body.name.toLowerCase(),
        password = req.body.password,
        email = req.body.email.toLowerCase(),
        session = req.sessionID,
        isMobile = req.body.mobile;

    //try to create
    var user = new User({name: name, email: email, password: password});
    user.sessions.push(session);

    user.save(function(err, user){
        // respond with validation errors here
        if(err){ 
          console.log("validation errors:" + err); 
          res.json(400,  err);
        } else{
         console.log("created user: " + name);

         var inviteID = req.session.inviteID;

         // construct data variables for client side tracking
         var sessionData = Session.createSessionData(); 
         sessionData.userID = user.id;

         // create a welcome message 
         sessionData.announcements["welcome"] = "";

         //send welcome email 
         Mailer.welcome(user.email);

         var newSphere =  new Sphere({name: user.name + "'s sphere", owner: user._id, type: "Main" });
        	 // if the new user is being invited to an open sphere, assign them to it 
           if(req.session.invite == true){
           	req.session.invite = false; // turn the flag off 

              	Sphere.findOne({_id: inviteID}, function(err, invitedSphere){
              	
              		console.log(invitedSphere);

              		if(err || !invitedSphere){console.log("unable to find invited sphere");}

              		else{
                    if(invitedSphere.members.length < 6){ // make sure sphere isn't full
                      sessionData.announcements["joined"] = user.name + " joined the sphere";
                      console.log("Adding user to sphere: " + invitedSphere.id);
                      add_and_render(newSphere, invitedSphere);
                    }            
              		}	
              	});
           }else{	// create the user a sphere and plop them inside 
           	  console.log("Creating sphere for new user..");
      			  add_and_render(newSphere);
           }


        function add_and_render(newSphere, invitedSphere){
         	newSphere.members.push({id: user.id , name: user.name});

         	newSphere.save(function(err, mainSphere){

         		if(err || !mainSphere){ console.log("Error saving sphere"); }

         		else{
         			console.log("The saved main sphere: " + mainSphere);
              user.mainSphere = mainSphere; // set the newly created sphere as the user's mainsphere 
         			user.spheres.push({object: newSphere, nickname: user.name}); // add the sphere to user's sphere list 
              if(invitedSphere){
                invitedSphere.members.push({id: user.id, name: user.name});
                invitedSphere.save(function(err, invSphere){
                  console.log("The saved invited sphere: " + invSphere);
                  user.spheres.push({object: invSphere, nickname: user.name });
                  updateSessionData(user,mainSphere,invSphere);

                  // if its a personal invite find the user who sent it and update their spheres and notify them 
                  if(invSphere.type == "Personal"){
                    var sender = this.members[0].id;
                    if(sender == user.id){
                       sender = this.members[1].id;
                    }

                    User.findOne({_id:sender}, function(err, sender){
                      if(sender){
                        sender.newRequests++;
                        sender.spheres.push({object: invSphere, nickname: sender.name}); 
                        sender.save(function(err){
                          if(!err){
                            console.log("sender updated");
                          }
                        })
                      }
                    });

                  }
                });
              }else{
                updateSessionData(user,mainSphere);
              }


              user.save(function(err,user){
                if(err){console.log(err);}

                else{
                  console.log("User saved");
                }
              });
            }
          });
            

              function updateSessionData(user, mainSphere, invSphere){
                console.log("New user id: " + user.id);

                var name = user.name;

                var sphereIDs,
                    nicknames, 
                    current;

                // if the user joined through invite we want to place them in the invited sphere and give them the corresponding data
                if(invSphere){
                  sphereIDs = [mainSphere.id, invSphere.id];
                  nicknames = invSphere.nicknames;
                  current = invSphere.id;
                  req.session.newMember = true;

                  // add the invited sphere to the sphereMap

                  var inviteVal = {name: invSphere.getName(user.id), 
                                nickname: name, 
                                link: invSphere.link(ENV), 
                                updates: 0, 
                                type: invSphere.type, 
                                isOwner: user.isOwner(invSphere) };

                  sessionData.sphereMap[invSphere.id] = inviteVal;
                // otherwise just plop the user in their new mainSphere 
                }else{
                  sphereIDs = [mainSphere.id];
                  nicknames = mainSphere.nicknames;
                  current = mainSphere.id;
                  // flag the yourSphere announcement
                  sessionData.announcements["yourSphere"] = "";
                }

               	// build chat data for client side 
      					sessionData.sphereIDs = sphereIDs,
      					sessionData.nicknames = nicknames,
      					sessionData.username = name,
      					sessionData.currentSphere = current;
  		

  			      	// add the mainSphere to the sphereMap

                var mainVal = {name: mainSphere.getName(user.id), 
                              nickname: name, 
                              link: mainSphere.link(ENV), 
                              updates: 0, 
                              type: mainSphere.type, 
                              isOwner: user.isOwner(mainSphere) };

  			      	sessionData.sphereMap[mainSphere.id] = mainVal; 

  			      	console.log("Session's sphereMap: "  + sessionData.sphereMap);


                // flag user as logged in 
                req.session.isLogged = true;


               // if the user was invited to a sphere update the contacts before rendering 
               if(invSphere){
                 updateContacts(user, invSphere, sessionData, "includes/feed", res, req, isMobile);
               }else{
                  if(isMobile == "true"){
                    Session.respondJSON(res, sessionData);
                  }else{
                    Session.render(res, "includes/feed", sessionData);
                  }
                 Session.storeData(req, sessionData);
                 Session.sendCookie(res, user.email);
               }
         
              } // end update session 
		  } // end add and render


   	} 
  });

	
}


exports.login = function(req, res){

	//get credentials 
  console.log("Obtaining User Credentials...");
	var email = req.body.email.toLowerCase(),
	password = req.body.password;

  // pull the user and belonging spheres 
  User.findOne({email: email}).populate('spheres.object contacts requests').exec(function(err, user){
    if(!user || err){ 
      console.log("Invalid Email"); 
      res.json(400, {message: "The entered email doesn't exist", type: "email"});
    }else{
      console.log("Logging in: " + user.id);
      //authorize 
      user.comparePassword(password, function(err, isMatch){
        if(!isMatch || err){ 
          console.log("Incorrect Login Credentials");
          res.json(400, {message: "The email or password you entered is incorrect"});
        }else{
          retrieveSessionData(user, req, res, "includes/feed");
        }
      });
  }
  }); // end query 

}


exports.logout = function(req, res){
	req.session.destroy();
  res.clearCookie('email');
	console.log("Session ended: " + req.session);
	res.render("includes/login");
}

exports.invite = function(req,res){
   console.log("User being invited to sphere..");
   var inviteID = req.param('id');

   req.session.inviteID = inviteID;
   req.session.invite = true; 

   if(req.session.isLogged == true){
    User.findOne({sessions: {$in : [req.sessionID]}}, function(err, user){
      if(user){

      Sphere.findOne({_id: inviteID}, function(err,sphere){
          if(!sphere){
            console.log("Invited Sphere doesn't exist");
           } else{
              if(!user.isMember(sphere.id)){       // if the user isn't already  member plop them in 

                 var sessionData = req.session;
                 console.log("The Session Data: " + sessionData);
                 sessionData.username = user.name;
                 sessionData.nickname = user.name;
                 sessionData.userID = user.id;

                  // update both tracking lists and the users current sphere index 
                  user.spheres.push({object: sphere._id, nickname: user.name}); 
                  sphere.members.push({id: user.id , name: user.name});
                  user.currentSphere = user.spheres.length - 1;

                  // update the client side session data to contain info on this sphere 
                  sessionData.currentSphere = sphere.id;
                  sessionData.nicknames = sphere.nicknames;
                  sessionData.sphereIDs.push(sessionData.currentSphere);

                  var mapData = {name: sphere.getName(user.id), 
                                nickname: sessionData.nickname, 
                                link: sphere.link(ENV), 
                                updates: 0, 
                                type: sphere.type, 
                                isOwner: user.isOwner(sphere) };

                  sessionData.sphereMap[sessionData.currentSphere] = mapData;
                  
                  console.log("Updated sphereMap : " + JSON.stringify(sessionData.sphereMap));

                  // show the joined message 
                  sessionData.announcements["joined"] = user.name + " joined the sphere";

                  req.session.newMember = true;   // flag to show the user was just added to sphere

                  updateContacts(sphere, user, sessionData, "template_feed", res, req);

                }else{
                  exports.bookmark(req,res);
                }
         
            }

         
        });
      
      }
    });

  } else{
    res.render("template_join");
  }

}


exports.sendReset = function(req,res){
  var email = req.param('email');
  console.log("Creating reset token for: " + email);
  email = String(email.trim());

  User.findOne({email: email}, function(err, user){
    if(!user){
      console.log("User not found");
      res.json(400, "User not found");
    } 
    if(err){
      console.log(err);
    }

    if(user){
      console.log("Password reset account found");
      var token = crypto.randomBytes(64).toString('hex');
      user.passReset.token = token;
      user.passReset.created = moment();
      user.save(function(err,user){
        if(user){
          console.log("passReset for user: " + user.passReset);
          Mailer.sendReset(user.email, user.passReset.token, ENV);
          res.json(200);
        }
      });
    }
  });

}


exports.resetPass = function(req,res){
    var token = req.param('token');
    console.log("Reset requested with token: " + token);

     User.findOne({'passReset.token': token}, function(err, user){
      if(user){
        var now = moment();
        var created = moment(user.passReset.created);
        console.log("User found");
        console.log("Token creation: " + moment(user.passReset.created));
        console.log("Current Time: " + moment());
        if(now.diff(created, 'minutes') < 10){
          // show reset password 
          res.render("template_reset", {token: token, baseURL: baseURL});
          
        }else{
          // show time expired message
          console.log("token expired");
          res.render("template_expired", {baseURL:baseURL});
        }
  
      }else{
        console.log("token expired");
        res.render("template_expired", {baseURL:baseURL});
      }
     });
}


exports.newPass = function(req,res){
    var password = req.body.password;
    var confirmation = req.body.confirm;
    var token = req.body.token;

   // if passwords match 
   if(password == confirmation){
      User.findOne({'passReset.token': token}, function(err,user){
          var now = moment();
          var created = moment(user.passReset.created);
          console.log("User found");
          console.log("Token creation: " + moment(user.passReset.created));
          console.log("Current Time: " + moment());
          if(now.diff(created, 'minutes') < 10){
            // change password
            user.password = password;
            user.save(function(err){
              if(!err){
                console.log("Password changed");
              }
            });

            res.render("includes/resetSuccess", {url: baseURL + "bookmark/"});
            
          }else{
            // show time expired message
            console.log("token expired");
            res.render("includes/expired", {baseURL: baseURL});
          }
      });
   }    
}

// updates the contacts of both the new sphere member and existing sphere members and then renders the view
function updateContacts(user, sphere, sessionData, view, res, req, isMobile){
      var contacts = sphere.getOtherMembers(user.id);

      // add the sphere members to invited user's contacts 
      user.addSphereContacts(sphere.memberIds, function(members){

          sessionData.contacts = contacts;

          user.save(function(err){
            if(err){
              console.log(err);
           }else{
              //render feed 
              if(isMobile == "true"){
                  Session.respondJSON(res, sessionData);
              }else{
                  Session.render(res, view, sessionData);
              }


              // store session data 
              Session.storeData(req, sessionData);
              Session.sendCookie(res, user.email);
           }
          });
          sphere.save(function(err){console.log(err);})
          User.updateMemberContacts(members, user);     
      }); 
}



function retrieveSessionData(user, req, res, layout){
          // mobile flag
          var isMobile = req.body.mobile;

          // track target sphereID depending on login situation and join date to get all relevant posts
          var sphereID,
              joined;

          // create hash for session tracking
          sessionData = Session.createSessionData();
          sessionData.username = user.name;
          sessionData.userID = user.id;

          // gather data about all of the current user's spheres 
          var sphereData = user.sphereData(ENV);
          sessionData.sphereMap = sphereData["sphereMap"],
          sessionData.sphereIDs = sphereData["sphereIDs"],
          sessionData.totalUpdates = sphereData["totalUpdates"];
          
          console.log("User's spheremap: " + JSON.stringify(sessionData.sphereMap));

          // if the user is being invited to a sphere just track the nickname and sphere id for now
          if(req.session.invite == true){
              sessionData.nickname = user.name;
              sphereID = req.session.inviteID;
              joined = moment(); // track the time the user joined the sphere as now 
          }else{  

              // otherwise we already have the target sphere so track its data 
              targetSphere = user.targetSphere();
              targetSphere.updates = 0; // served sphere doesn't need update notifications
              sessionData.nicknames = targetSphere.object.nicknames;
              sessionData.nickname = targetSphere.nickname;
              sessionData.currentSphere = targetSphere.object._id;
              sphereID = sessionData.currentSphere;
              joined = targetSphere.joined;
          }
          
          Sphere.findOne({_id: sphereID}).populate('posts').exec(function(err, sphere){ 
            if(err|!sphere){
              console.log("unable to populate sphere");
            }else{
              // if the user has been invited to a sphere, make sure its valid and plop them in with a joined message 
              if(req.session.invite == true){
                    if(!user.isMember(sphere.id)){  
                    // add the user to the sphere and the sphere to the user's sphere list 
                    sphere.members.push({id: user.id , name: user.name});
                    user.spheres.push({object: sphere, nickname: user.name});

                    var sphereName = sphere.getName(user.id);

                    // create a sphere map key/value for the invited sphere and add the name to the list of user's spheres 
                    sessionData.currentSphere = sphere.id;
                    sessionData.nicknames = sphere.nicknames;
                    sessionData.sphereIDs.push(sessionData.currentSphere); 

                    var mapData = {name: sphere.getName(user.id), 
                                nickname: sessionData.nickname, 
                                link: sphere.link(ENV), 
                                updates: 0, 
                                type: sphere.type, 
                                isOwner: user.isOwner(sphere) };

                    sessionData.sphereMap[sessionData.currentSphere] = mapData;
                  
   

                    sessionData.announcements["joined"] = user.name + " joined the sphere";
                    req.session.invite = false; 
                    req.session.newMember = true;
                    sphere.save(function(err){
                      if(err){console.log(err);}
                    });
                  } else{
                    console.log("User already exists in sphere");
                    res.redirect('/bookmark');
                  }
             
               // otherwise just get all the recorded messages since the user has joined the sphere 
              }else{
                for(var i = sphere.posts.length - 1; i > -1 ; i--){
                    var currentPost = sphere.posts[i];
                    var post = currentPost.getPostData(user, sphere.id, isMobile);
                    var key = currentPost.id;
                    sessionData.feed.push(key);
                    sessionData.posts[key] = post;
                }   
             }

             // get all the user contacts 
             user.getContactInfo(function(contacts, requests, invites){
               sessionData.contacts = contacts; 
               sessionData.requests = requests;
               sessionData.invites = invites;
               sessionData.newRequests = user.newRequests; 
                // if the user is logging in through a mobile platform respond with JSON session data 
                if(isMobile == "true"){
                  Session.respondJSON(res, sessionData);
                }else{
                  Session.render(res, layout, sessionData);
                } 


               // flag user as logged in 
               req.session.isLogged = true;

               // store session data 
               Session.storeData(req, sessionData);

               Session.sendCookie(res, user.email);

               // store the new session 
               user.sessions.push(req.sessionID);

               user.save(function(err,user){
                 if(err){console.log(err);}
                 else{
                   console.log("new user session saved: " + user.sessions);
                 }
                }); 

             });
          
           }
        });
}