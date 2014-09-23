
var mongoose = require("mongoose"),
    User     = require("../models/user"),
    Sphere 	 = require("../models/sphere");


var moment = require("moment");
var ENV = process.env.NODE_ENV;

var Session = require("../controllers/sessions");



// show action
exports.bookmark = function(req, res){
  console.log("Bookmarklet launching..");
	var sesh = req.session;

	if(sesh.isLogged == true){ 
    Session.render(res, "template_feed", sesh);
  }else{
    Session.render(res, "template_login");
  }
}

// create action 
exports.signup = function(req, res){

	console.log("signing up user with credentials: " + req.body);

   	// get parameters 
    var name = req.body.name,
        password = req.body.password,
        email = req.body.email,
        session = req.sessionID;	

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
         console.log(req.session.invite);

         var newSphere =  new Sphere({name: user.name + "'s sphere", owner: user._id, type: "Main" });
      	 // if the new user is being invited to an open sphere, assign them to it 
         if(req.session.invite == true){
         	req.session.invite = false; // turn the flag off 
          	Sphere.findOne({_id: inviteID}, function(err, invitedSphere){
          	
          		console.log(invitedSphere);

          		if(err || !invitedSphere){console.log("unable to find invited sphere");}

          		else{
          			if(invitedSphere.members.length < 6){	// make sure sphere isn't full
          				sessionData.announcements["joined"] = user.name + " joined the sphere";
          				console.log("Adding user to sphere: " + invitedSphere.id);
          				add_and_render(newSphere, invitedSphere);
          			}
          		}	
          	});
				
				

         }else {	// create the user a sphere and plop them inside 
         	  console.log("Creating sphere for new user..");
         	  // create a welcome message 
    			  sessionData.announcements["welcome"] = "Welcome to your sphere!";
    			  add_and_render(newSphere);
         }


         function add_and_render(newSphere, invitedSphere){
         	newSphere.members.push({id: user.id , name: user.name});

         	newSphere.save(function(err, sphere){

         		if(err || !sphere){ console.log("Error saving sphere"); }

         		else{
         			console.log("The saved main sphere: " + sphere);
              user.mainSphere = sphere; // set the newly created sphere as the user's mainsphere 
         			user.spheres.push({object: newSphere, nickname: user.name }); // add the sphere to user's sphere list 
              if(invitedSphere){
                invitedSphere.members.push({id: user.id, name: user.name});
                invitedSphere.save(function(err, sphere){
                  console.log("The saved invited sphere: " + sphere);
                  user.spheres.push({object:sphere, nickname: user.name });
                  updateSessionData(user,sphere);
                });
              }else{
                updateSessionData(user,sphere);
              }

              user.save(function(err,user){
                if(err){console.log(err);}

                else{
                  console.log(user);
                }
              });

              function updateSessionData(user, sphere){
                var sphereName = sphere.getName(user.id);

               	// build chat data for client side 
      					sessionData.sphereIDs = [sphere.id],
      					sessionData.nicknames = sphere.nicknames,
      					sessionData.nickname = user.name,
      					sessionData.currentSphere = sphere.id;
  		

  			      	// build a map of sphere data for the client 
  			      	sessionData.sphereMap[sphere.id] =  {name: sphereName, nickname: sessionData.nickname, link: sphere.link(ENV) , updates: 0, type: sphere.type}; 

  			      	console.log("Session's sphereMap: "  + sessionData.sphereMap);

                Session.render(res, "includes/feed", sessionData);

                Session.storeData(req, sessionData);

  					    // flag user as logged in 
  		        	req.session.isLogged = true;

              }


		        }


	      
         	});

        } // end add_and_render


   	} 
  });

	
}


exports.login = function(req, res){

	//get credentials 
  console.log("Obtaining User Credentials...");
	var email = req.body.email,
	password = req.body.password,
  isMobile = req.body.mobile;

  // pull the user and belonging spheres 
  User.findOne({email: email}).populate('spheres.object contacts').exec(function(err, user){
    if(!user || err){ 
      console.log("Invalid Email"); 
      res.json(400, {message: "The entered email doesn't exist", type: "email"});
    }else{
      //authorize 
      user.comparePassword(password, function(err, isMatch){
        if(!isMatch || err){ 
          console.log("Incorrect Login Credentials");
          res.json(400, {message: "The email or password you entered is incorrect"});
        }else{
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
          

          // if the user is being invited to a sphere just track the nickname and sphere id for now
          if(req.session.invite == true){
              sessionData.nickname = user.name;
            	sphereID = req.session.inviteID;
            	joined = moment(); // track the time the user joined the sphere as now 
          }else{	
              console.log(user);
              // otherwise we already have the target sphere so track its data 
              targetSphere = user.targetSphere();
              console.log(targetSphere);
              targetSphere.updates = 0; // served sphere doesn't need update notifications
        			sessionData.nicknames = targetSphere.object.nicknames;
              sessionData.nickname = targetSphere.nickname;
              sessionData.currentSphere = targetSphere.object._id;
              sphereID = sessionData.currentSphere;
      				joined = targetSphere.joined;
    	  	}
          
          Sphere.findOne({_id: sphereID}).populate('posts').exec(function(err, sphere){ 
            console.log(sphere);
            if(err|!sphere){
            	console.log("unable to populate sphere");
            }else{
            	// if the user has been invited to a sphere, make sure its valid and plop them in with a joined message 
        		 	if(req.session.invite == true){
                    if(!user.isMember(sphere)){  
          		 			// add the user to the sphere and the sphere to the user's sphere list 
          		 			sphere.members.push({id: user.id , name: user.name});
          		 			user.spheres.push({object: sphere, nickname: user.name});

                    var sphereName = sphere.getName(user.id);

          		 			// create a sphere map key/value for the invited sphere and add the name to the list of user's spheres 
          		 			sessionData.currentSphere = sphere.id;
          		 			sessionData.nicknames = sphere.nicknames;
          		 			sessionData.sphereMap[sessionData.currentSphere] = {name: sphereName, nickname: sessionData.nickname, link: sphere.link(ENV) , updates: 0, type: sphere.type }
          		 			sessionData.sphereIDs.push(sessionData.currentSphere); 

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
             user.getContacts(function(contacts){
               sessionData.contacts = contacts; 
                console.log("The users contacts: " + JSON.stringify(sessionData.contacts));

                // if the user is logging in through a mobile platform respond with JSON session data 
                if(isMobile == "true"){
                  Session.respondJSON(res, sessionData);
                }else{
                  Session.render(res, "includes/feed", sessionData);
                } 


               // store session data 
               Session.storeData(req, sessionData);


                 // flag user as logged in 
               req.session.isLogged = true;

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
        });
      }
    }); // end query 

}


exports.logout = function(req, res){
	req.session.destroy();
	console.log("Session ended");
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
              console.log("The user:" + user);
              console.log("The sphere:" + sphere);
              if(!user.isMember(sphere)){       // if the user isn't already  member plop them in 

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
                  sessionData.sphereMap[sessionData.currentSphere] = {name: sphere.getName(user.id), nickname: sessionData.nickname, link: sphere.link(ENV), updates: 0, type: sphere.type}; 
                  
                  console.log("Updated sphereMap : " + JSON.stringify(sessionData.sphereMap));

                  // show the joined message 
                  sessionData.announcements["joined"] = user.name + " joined the sphere";

                  req.session.newMember = true;   // flag to show the user was just added to sphere

                  var contacts = sphere.getOtherMembers(user.id);

                  // add the sphere members to invited user's contacts 
                  user.addSphereContacts(sphere.memberIds, function(members){
                      console.log(contacts);
                      sessionData.contacts = contacts;
                      console.log("The user's contacts: " + contacts);
                      console.log("Members: " + members);
                      user.save(function(err){
                        if(err){
                          console.log(err);
                        }else{
                          //render feed 
                          Session.render(res, "template_feed", sessionData);
                          // store session data 
                          Session.storeData(req, sessionData);
                        }
                      });
                      sphere.save(function(err){console.log(err);})
                      User.updateMemberContacts(members, user);     
                  }); 

                }else{
                  exports.bookmark(req,res);
                }
         
            }

         
        });
      
      }
    });

  } else{
    res.render("template_login");
  }

}

