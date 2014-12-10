var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: [{ 					// list of all the member names in a sphere 
			  id: {type: String },
			  nickname: {type: String , default: ""}, //members nickname on the sphere
			  name:  {type: String}, 			// username
        seenChat: {type: Boolean, default: true}
			 }],								
	posts: [{type: ObjectId, ref: 'Post'}],
	owner: {type: ObjectId, ref: 'User'},
  type: {type: String, default: "Group"},
  chat: [{type: ObjectId, ref: 'Message'}]
});

sphereSchema.virtual('nicknames').get(function(){
	var nicknames = [];
	for(var i = 0; i< this.members.length ; i++){
		var nickname = this.members[i].nickname.trim();
		if(nickname === "" ){
			nicknames.push(this.members[i].name);
		}else{
			nicknames.push(nickname);	
		}
	}
	return nicknames;
});

// returns the ids of all members in a sphere 
sphereSchema.virtual('memberIds').get(function(){
  var ids = [];
  for(var i = 0; i< this.members.length ; i++){
      var memberId = this.members[i].id;
      ids.push(memberId);
  }
  return ids;
});



// stores a sphere chat message 
sphereSchema.methods.addMessage = function(message){
  this.chat.push(message);

  this.save(function(err,sphere){
    if(sphere){
      console.log("Message added to sphere");
    }
  });


}

// returns if there is a conversation in the sphere 
sphereSchema.methods.hasChat = function(){
  if(this.chat.length > 0){ return true; }

  return false; 
}

// updates all all members of sphere's chat to unseen besides given user
sphereSchema.methods.updateChat = function(userID){
  var members = this.members; 
  members.forEach(function(member){
      if(member.id != userID){
          member.seenChat = false; 
      }
  });  
}

// returns if user has seen chat or not 
sphereSchema.methods.hasSeenChat = function(userID){
  console.log("Checking chat status..");
  var members = this.members; 

  for(var i = 0; i < members.length; i++){
    member = members[i];
    if(member.id == userID){
        console.log("member found");
        return member.seenChat; 
    }
  }
}

// flags that a user has seen the sphere convo
sphereSchema.methods.chatSeen = function(userID){
  var members = this.members;

  for(var i =0; i< members.length; i++){
    member = members[i];
    if(member.id == userID){
      member.seenChat = true;
      console.log("Chat marked as seen");
    }
  }
}

// returns the name seen by the user for a sphere 
sphereSchema.methods.getName = function(userID){
  console.log("Getting name for: " + userID);
  if(this.type === "Group" || this.type === "Main"){
    return this.name;
  }else{
    var members = this.members;
    for(var i = 0; i < members.length; i++){
      if(members[i].id != userID){
          console.log("Direct Message Member Name Found");
          return members[i].name;
      }
    }
  } 
}

sphereSchema.methods.setNick = function(userID, nickname, next){
    var currentSphere = this;
    currentSphere.members.forEach(function(member){
      if(member.id == userID){
        member.nickname = nickname;
        currentSphere.save(function(err, sphere){
          if(sphere){
            console.log("Sphere side nickname updated");
            next(sphere);
          }
        });
      }
    });

}

// returns the other members aside from the given user in a sphere 
sphereSchema.methods.getOtherMembers = function(userID){
  var members = this.members;
  var contacts = {};
  for(var i =0; i < members.length; i++){
    var member = members[i];
     if(member.id != userID){
        contacts[member.id] = member.name;
     }
  }

  return contacts;
}




// checks if the sphere is the users mainSphere 
sphereSchema.methods.isMain = function(sphere){
  console.log("Checking if mainSphere...");
  if(this.id == sphere){
    console.log("mainsSphere matched..");
    return true;
  }

  return false; 
}

// returns link to sphere for invites, the base url differs locally vs on the server
sphereSchema.methods.link = function(ENV){
	if(ENV == "production"){
	  return "http://www.dropsphere.com/invite/" + this.id;	
	}
	return "http://localhost:3500/invite/" + this.id;
};



// Finds a {type: "Personal"} sphere between two users, returns false if a personal sphere doesn't exist
sphereSchema.statics.getPersonal = function(sender, reciever, next){
  this.findOne({$and: [{'members.id': sender}, {'members.id': reciever}, {'type': "Personal"}]}).populate('posts').exec(function(err,sphere){
      if(sphere){
        next(sphere);
      }else{
        next(false); 
      }
  });
}




// saves post for all users in a sphere 
sphereSchema.statics.savePost = function(User, sphereID, post, next){
	this.findOne({_id: sphereID}, function(err, sphere){
		 if(sphere){
          console.log("sphere found")
          post.addLoc(sphere.id, sphere.name);
          post.fillViewers(sphere.members, sphere.id, sphere.name, function(filledPost){
            filledPost.save(function(err, msg){
              if(err){
                console.log(err);
              }

              if(msg){
                next(msg);
              }
            }); 

          });
         

          sphere.posts.push(post);
          sphere.save(function(err, sphere){
            console.log(sphere.posts.length);

          });

          for(var i = 0; i < sphere.members.length; i++){
             var member = sphere.members[i].id;
             var postCreator = post.creator.object;
             if(member != postCreator){
                User.update({$and: [{_id: member} , {'spheres.object': sphere._id}]}, {'$inc': {'spheres.$.updates' : 1}}, function(err){
                    if(err){console.log(err);}
                    else{
                      console.log("notifications updated");
                    }
                });
             } 
          } 
        } else{
        	console.log("Sphere not found");
        }

	});
};

module.exports = mongoose.model('Sphere', sphereSchema);