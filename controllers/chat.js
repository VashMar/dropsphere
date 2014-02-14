
var mongoose = require("mongoose"),
    User     = require("../models/user");
    Sphere 	 = require("../models/sphere");


var moment = require("moment");
var ENV = process.env.NODE_ENV;





// show action
exports.bookmark = function(req, res){

	var sesh = req.session;
	console.log(sesh);
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

      	 // if the new user is being invited to an open sphere, assign them to it 
         if(req.session.invite == true){
             req.session.isNew = true;     // flag for user who just logged in 
             res.redirect('/bookmark/invite/' + req.session.inviteID);
         } else {	// create the user a sphere and plop them inside 

         	var newSphere = new Sphere({name: user.name + "'s sphere", owner: user._id });
         	newSphere.members.push({id: user.id , name: user.name});

         	newSphere.save(function(err, sphere){

         		if(err || !sphere){ console.log("Error saving sphere"); }

         		else{

         			user.spheres.push({object: newSphere, nickname: user.name }); // add the sphere to user's sphere list 


         			/*

          			// data about current user and their current sphere
		          	var username = user.name,
		          		index = user.currentSphere,
		  			 	targetSphere = user.spheres[index],
		  			 	nicknames = targetSphere.object.nicknames,
		            	nickname = targetSphere.nickname,
		            	currentSphere = targetSphere.object.name;


		            // data about all current user's spheres 
		  			var sphereData = user.sphereData(ENV);
		  				sphereMap = sphereData["sphereMap"],
		  				sphereNames = sphereData["sphereNames"],
		  				totalUpdates = sphereData["totalUpdates"];
	
					*/


         			// build chat data for client side 
       
			        var sphereMap = {},
						sphereNames = [sphere.name],
						totalUpdates = 0,
						index = 0,
						username = user.name,
						nicknames = sphere.nicknames,
						nickname = sphere.nickname,
						currentSphere = sphere.name,
						messages = {};

			   
			      	// create a welcome message 
			      	messages["welcome"] = "Welcome to your sphere!";

			      	// build a map of sphere data for the client 
			      	sphereMap[sphere.name] =  {id: sphere._id, nickname: user.name, link: sphere.link(ENV) , updates: 0}; 

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

         		}


	                // store session data 
	                req.session.sphereMap = sphereMap;
	                req.session.sphereNames = sphereNames;
	                req.session.username = username;
	                req.session.name = nickname;
	                req.session.nicknames = nicknames;
	                req.session.messages = messages;
	                req.session.currentSphere = currentSphere;
	                req.session.totalUpdates = totalUpdates;

	 				// flag user as logged in 
	            	req.session.isLogged = true;

	            	user.save();

         	});

         } 



        }
    });


}


/*

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





*/

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

          	// data about current user and their current sphere
          	var username = user.name,
          		index = user.currentSphere,
  			 	targetSphere = user.spheres[index],
  			 	nicknames = targetSphere.object.nicknames,
            	nickname = targetSphere.nickname,
            	currentSphere = targetSphere.object.name;


            // data about all current user's spheres 
  			var sphereData = user.sphereData(ENV);
  				sphereMap = sphereData["sphereMap"],
  				sphereNames = sphereData["sphereNames"],
  				totalUpdates = sphereData["totalUpdates"];
  			 	

            Sphere.findOne({_id: targetSphere.object._id}).populate('messages', null, {date: {$gte: targetSphere.joined }}).exec(function(err, sphere){ 
            	if(err|!sphere){
            		console.log("unable to populate messages for sphere")
            	} else {
            		 var messages = {};
                     var key; 
                 
                     for(var i = 0; i < sphere.messages.length - 1; i++){
                            
                         var msg1 = sphere.messages[i].sender + ": " + sphere.messages[i].text;
                         var msg2 = sphere.messages[i+1].sender + ": " + sphere.messages[i].text;
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

         /*    console.log(req.session.username + " is logged in");

             if(req.session.invite == true){
                req.session.isNew = true;     // flag for user who just logged in 
                res.redirect('/bookmark/invite/' + req.session.inviteID);
             }else{
                res.render("includes/chat", {name: user.name});
             }

             */
            
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



