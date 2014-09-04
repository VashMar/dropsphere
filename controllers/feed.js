
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

         console.log(req.session.invite);

         var newSphere = new Sphere();
      	 // if the new user is being invited to an open sphere, assign them to it 
         if(req.session.invite == true){
         	req.session.invite = false; // turn the flag off 
          	Sphere.findOne({_id: inviteID}, function(err, invitedSphere){
          	
          		console.log(invitedSphere);

          		if(err || !invitedSphere){console.log("unable to find invited sphere");}

          		else{
          			if(invitedSphere.members.length < 6){	// make sure sphere isn't full
          				newSphere = invitedSphere;
          				sessionData.announcements["joined"] = user.name + " joined the sphere";
          				console.log("Adding user to sphere: " + invitedSphere.id);
          				add_and_render(newSphere);
          			}
          		}	
          	});
				
				

         }else {	// create the user a sphere and plop them inside 
         	  console.log("Creating sphere for new user..");
         	  newSphere =  new Sphere({name: user.name + "'s sphere", owner: user._id });
         	  // create a welcome message 
    			  sessionData.announcements["welcome"] = "Welcome to your sphere!";
    			  add_and_render(newSphere);
         }


         function add_and_render(newSphere){
         	newSphere.members.push({id: user.id , name: user.name});

         	newSphere.save(function(err, sphere){

         		if(err || !sphere){ console.log("Error saving sphere"); }

         		else{
         			console.log("The saved sphere: " + sphere);
         			user.spheres.push({object: newSphere, nickname: user.name }); // add the sphere to user's sphere list 

             	// build chat data for client side 
    					sessionData.sphereNames = [sphere.name],
    					sessionData.nicknames = sphere.nicknames,
    					sessionData.nickname = user.name,
    					sessionData.currentSphere = sphere.name,
		

			      	// build a map of sphere data for the client 
			      	sessionData.sphereMap[sphere.name] =  {id: sphere._id, nickname: sessionData.nickname, link: sphere.link(ENV) , updates: 0}; 

			      	console.log(sessionData.sphereMap);

              Session.render(res, "includes/feed", sessionData);

              Session.storeData(req, sessionData);

					    // flag user as logged in 
		        	req.session.isLogged = true;

		        	user.save(function(err,user){
		        		if(err){console.log(err);}

		        		else{
		        			console.log(user);
		        		}
		        	});

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

          // gather data about all of the current user's spheres 
          var sphereData = user.sphereData(ENV);
          sessionData.sphereMap = sphereData["sphereMap"],
          sessionData.sphereNames = sphereData["sphereNames"],
          sessionData.totalUpdates = sphereData["totalUpdates"];
          

          // if the user is being invited to a sphere just track the nickname and sphere id for now
          if(req.session.invite == true){
              nickname = user.name;
            	sphereID = req.session.inviteID;
            	joined = moment(); // track the time the user joined the sphere as now 
          }else{	
              console.log(user);
              // otherwise we already have the target sphere so track its data 
              targetSphere = user.targetSphere();
              targetSphere.updates = 0; // served sphere doesn't need update notifications
        			sessionData.nicknames = targetSphere.object.nicknames;
              sessionData.nickname = targetSphere.nickname;
              sessionData.currentSphere = targetSphere.object.name;
      				sphereID = targetSphere.object._id;
      				joined = targetSphere.joined;
    	  	}
          
          Sphere.findOne({_id: sphereID}).populate('posts', null, {date: {$gte: joined }}).exec(function(err, sphere){ 
            console.log(sphere);
            if(err|!sphere){
            	console.log("unable to populate messages for sphere");
            }else{
            	// if the user has been invited to a sphere, make sure its open and plop them in with a joined message 
        		 	if(req.session.invite == true){
        		 		if(sphere.members.length < 6){
                    if(!user.isMember(sphere)){  
          		 			// add the user to the sphere and the sphere to the user's sphere list 
          		 			sphere.members.push({id: user.id , name: user.name});
          		 			user.spheres.push({object: sphere, nickname: user.name});

          		 			// create a sphere map key/value for the invited sphere and add the name to the list of user's spheres 
          		 			sessionData.currentSphere = sphere.name;
          		 			sessionData.nicknames = sphere.nicknames;
          		 			sessionData.sphereMap[sessionData.currentSphere] = {id: sphere._id, nickname: sessionData.nickname, link: sphere.link(ENV) , updates: 0}
          		 			sessionData.sphereNames.push(sessionData.currentSphere); 

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
                }else{
                  console.log("Sphere is full");
                }
        		 	 // otherwise just get all the recorded messages since the user has joined the sphere 
        		 	}else{
	              for(var i = sphere.posts.length - 1; i > -1 ; i--){
                    var currentPost = sphere.posts[i];
                    var post = currentPost.getPostData(user, isMobile);
                    var key = currentPost.id;
                    sessionData.feed.push(key);
                    sessionData.posts[key] = post;
                }   
	           }

             // get all the user contacts 
             sessionData.contacts = user.getContacts();
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
              if(sphere.members.length < 6){
                if(!user.isMember(sphere)){       // if the user isn't already  member plop them in 

                 var sessionData = Session.createSessionData();
                 sessionData.username = user.name 

                  // update both tracking lists and the users current sphere index 
                  user.spheres.push({object: sphere._id, nickname: user.name}); 
                  sphere.members.push({id: user.id , name: user.name});
                  user.currentSphere = sphere.members.length - 1;

                  // update the client side session data to contain info on this sphere 
                  sessionData.currentSphere = sphere.name;
                  sessionData.nicknames = sphere.nicknames;
                  sessionData.sphereNames.push(sessionData.currentSphere);
                  sessionData.sphereMap[sessionData.currentSphere] = {id: sphere._id, nickname: sessionData.nickname, link: sphere.link(ENV), updates: 0}; 
               
                  // show the joined message 
                  sessionData.announcements["joined"] = user.name + " joined the sphere";

                  req.session.newMember = true;   // flag to show the user was just added to sphere

                  // add the sphere members to invited user's contacts 
                  user.addSphereContacts(sphere.memberIds, function(members){
                    sessionData.contacts = user.getContacts();
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
              }else{
                 console.log("sphere is full")
              } 
            }

         
        });
      
      }
    });

  } else{
    res.render("template_login");
  }

}

