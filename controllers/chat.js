
var mongoose = require("mongoose"),
    User     = require("../models/user"),
    Sphere 	 = require("../models/sphere");


var moment = require("moment");
var ENV = process.env.NODE_ENV;





// show action
exports.bookmark = function(req, res){

	var sesh = req.session;

	if(sesh.isLogged == true){ 
        res.render("template_chat", { data: {
                                    nickname:  sesh.nickname,
                                    username: sesh.username,
                                    nicknames: sesh.nicknames,
                                    messages: sesh.messages,
                                    sphereMap: sesh.sphereMap,
                                    sphereNames: sesh.sphereNames,
                                    currentSphere: sesh.currentSphere,
                                    totalUpdates: sesh.totalUpdates
                                    }

                                  });       
   }else{
        res.render("template_login");
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
    var user = new User({name: name, email: email, password: password, session: session});

    user.save(function(err, user){
        // respond with validation errors here
        if(err){ 
          console.log("validation errors:" + err); 
          res.json(400,  err);
        } else{

         console.log("created user: " + name);

        
         var inviteID = req.session.inviteID;
         // construct data variables for client side tracking
         var username = user.name,
         	 nicknames = [],
         	 nickname = username,
         	 currentSphere = "",
         	 sphereData = {},
         	 sphereMap = {},
         	 sphereNames = [], 
         	 totalUpdates = 0,
         	 messages = {};

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
          				messages["joined"] = user.name + " joined the sphere";
          				console.log("Adding user to sphere: " + invitedSphere.id);
          				add_and_render(newSphere);
          			}
          		}	
          	});
				
				

         } else {	// create the user a sphere and plop them inside 
         	  console.log("Creating sphere for new user..");
         	  newSphere =  new Sphere({name: user.name + "'s sphere", owner: user._id });
         	  // create a welcome message 
    			  messages["welcome"] = "Welcome to your sphere!";
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
    					sphereNames = [sphere.name],
    					nicknames = sphere.nicknames,
    					nickname = user.name,
    					currentSphere = sphere.name,
		

			      	// build a map of sphere data for the client 
			      	sphereMap[sphere.name] =  {id: sphere._id, nickname: nickname, link: sphere.link(ENV) , updates: 0}; 

			      	console.log(sphereMap);

                    res.render("includes/chat", { data: {
                   									nickname:  nickname,
                    								username: username,
                    								nicknames: nicknames,
                    								messages: messages,
                    								sphereMap: sphereMap,
                    								sphereNames: sphereNames,
                    								currentSphere: currentSphere,
                    								totalUpdates: totalUpdates
                    								}

                    							}); 




                // store session data 
			          req.session.sphereMap = sphereMap;
		            req.session.sphereNames = sphereNames;
		            req.session.username = username;
		            req.session.name = nickname;
		            req.session.nicknames = nicknames;
		            req.session.messages = messages;
		            req.session.currentSphere = currentSphere;
		            req.session.totalUpdates = totalUpdates;
		            req.session.newMember = true;

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
	var email = req.body.email,
	password = req.body.password;

  	// pull the user and belonging spheres 
    User.findOne({email: email}).populate('spheres.object').exec(function(err, user){
      if(!user || err){ 
        console.log("Invalid Email"); 
        res.json(400, {message: "The entered email doesn't exist", type: "email"});
      }

      else{
      	//authorize 
        user.comparePassword(password, function(err, isMatch){
          if(!isMatch || err){ 
             console.log("Incorred Login Credentials");
             res.json(400, {message: "The email or password you entered is incorrect"});
          }

          else{

          	console.log(user.spheres);

          	// data about current user and their current sphere
          	var username = user.name,
          		  nicknames,
          		  nickname,
          		  currentSphere,
          		  joined,
          		  sphereID;


          	// if the user is being invited to a sphere just track the nickname and sphere id for now
            if(req.session.invite == true){
              	nickname = user.name;
            		sphereID = req.session.inviteID;
            		joined = moment(); // track the time the user joined the sphere as now 
          	} else{	// otherwise we already have the target sphere so track its data 
            	 	var targetSphere = user.spheres[user.currentSphere];
                targetSphere.updates = 0; // served sphere doesn't need update notifications
        			 	nicknames = targetSphere.object.nicknames;
                nickname = targetSphere.nickname;
                currentSphere = targetSphere.object.name;
      				  sphereID = targetSphere.object._id;
      				  joined = targetSphere.joined;
    	  	  }

    		
            // data about all of the current user's spheres 
      			var sphereData = user.sphereData(ENV);

      			var	sphereMap = sphereData["sphereMap"],
      				  sphereNames = sphereData["sphereNames"],
      				  totalUpdates = sphereData["totalUpdates"];
  			 	

            Sphere.findOne({_id: sphereID}).populate('messages', null, {date: {$gte: joined }}).exec(function(err, sphere){ 
            	console.log(sphere);
            	if(err|!sphere){
            		console.log("unable to populate messages for sphere");
            	} else {
            		 var messages = {};
            		 // if the user has been invited to a sphere, make sure its open and plop them in with a joined message 
        		 	if(req.session.invite == true){
        		 		if(sphere.members.length < 6){
                    if(!user.isMember(sphere)){  
          		 			// add the user to the sphere adn the sphere to the user's sphere list 
          		 			sphere.members.push({id: user.id , name: user.name});
          		 			user.spheres.push({object: sphere, nickname: user.name});

          		 			// create a sphere map key/value for the invited sphere and add the name to the list of user's spheres 
          		 			currentSphere = sphere.name;
          		 			nicknames = sphere.nicknames;
          		 			sphereMap[currentSphere] = {id: sphere._id, nickname: nickname, link: sphere.link(ENV) , updates: 0}
          		 			sphereNames.push(currentSphere); 

          		 			messages["joined"] = user.name + " joined the sphere";
          		 			req.session.invite = false; 
          		 			req.session.newMember = true;
          		 			sphere.save(function(err){
          		 				if(err){console.log(err);}
          		 			});
                  } else{
                    console.log("User already exists in sphere");
                  }
                } else {
                  console.log("Sphere is full");
                }
        		 	 // otherwise just get all the recorded messages since the user has joined the sphere 
        		 	} else {
        		 		 console.log(sphere.messages[sphere.messages.length-1]);
	                    var key; 
	                 
	                    for(var i = 0; i < sphere.messages.length - 1; i++){
	                            
	                        var msg1 = [sphere.messages[i].sender , sphere.messages[i].text, sphere.messages[i].isLink];
	                        var msg2 = [sphere.messages[i+1].sender , sphere.messages[i+1].text, sphere.messages[i+1].isLink];
	                        var time1 = moment(sphere.messages[i].date);
	                        var time2 = moment(sphere.messages[i+1].date);
	                            
	                        // create a hash key for the date of the first message that points to an array, and store the message in the array
	                        if(i == 0){
	                           key =  time1.format();
	                           messages[key] = [msg1];
	                        }

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

                      console.log(messages);

	                }

                  res.render("includes/chat", { data: {
                   								nickname:  nickname,
                    							username: username,
                    							nicknames: nicknames,
                    							messages: messages,
                    							sphereMap: sphereMap,
                    							sphereNames: sphereNames,
                    							currentSphere: currentSphere,
                    							totalUpdates: totalUpdates
                    						}

                    						}); 


	                // store session data 
	                req.session.sphereMap = sphereMap;
	                req.session.sphereNames = sphereNames;
	                req.session.username = username;
	                req.session.nickname = nickname;
	                req.session.nicknames = nicknames;
	                req.session.messages = messages;
	                req.session.currentSphere = currentSphere;
	                req.session.totalUpdates = totalUpdates;

	 				      // flag user as logged in 
	            	req.session.isLogged = true;

	             	// store the new session 
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
   var sesh = req.session;

   var username = sesh.username,
       nicknames = [],
       nickname =  username,
       currentSphere = "",
       sphereMap = sesh.sphereMap,
       sphereNames = sesh.sphereNames, 
       totalUpdates = sesh.totalUpdates,
       messages = {};


   if(req.session.isLogged == true){
    User.findOne({session: req.sessionID}, function(err, user){
      if(user){

      Sphere.findOne({_id: inviteID}, function(err,sphere){
          if(!sphere){
            console.log("Invited Sphere doesn't exist");
           } else{
              console.log("The user:" + user);
              console.log("The sphere:" + sphere);
              if(sphere.members.length < 6){
                if(!user.isMember(sphere)){         // if the user isn't already  member plop them in 
          
                  // update both tracking lists and the users current sphere index 
                  user.spheres.push({object: sphere._id, nickname: user.name}); 
                  sphere.members.push({id: user.id , name: user.name});
                  user.currentSphere = sphere.members.length - 1;



                  // update the client side session data to contain info on this sphere 
                  currentSphere = sphere.name;
                  nicknames = sphere.nicknames;
                  sphereNames.push(currentSphere);
                  sphereMap[currentSphere] = {id: sphere._id, nickname: nickname, link: sphere.link(ENV) , updates: 0}; 

                  // show the joined message 
                  messages["joined"] = username + " joined the sphere";

                  req.session.newMember = true;   // flag to show the user was just added to sphere

                  user.save(function(err){console.log(err);});
                  sphere.save(function(err){console.log(err);});

                }else{
                  console.log("User already exists in sphere");

                }
              }else{
                 console.log("sphere is full")
              } 
            }
         
        });

           res.render("template_chat", { data: {
                                    nickname:  nickname,
                                    username:  username,
                                    nicknames: nicknames,
                                    messages:  messages,
                                    sphereMap: sphereMap,
                                    sphereNames: sphereNames,
                                    currentSphere: currentSphere,
                                    totalUpdates: totalUpdates
                                    }

                                  });       
          
          // store session data 
          req.session.sphereMap = sphereMap;
          req.session.sphereNames = sphereNames;
          req.session.username = username;
          req.session.nickname = nickname;
          req.session.nicknames = nicknames;
          req.session.messages = messages;
          req.session.currentSphere = currentSphere;
          req.session.totalUpdates = totalUpdates;
      
      }
    });

  } else{
    res.render("template_login");
  }

}

