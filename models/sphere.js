var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: [{ 					// list of all the member names in a sphere 
			  id: {type: String },
			  nickname: {type: String , default: ""}, //members nickname on the sphere
			  name:  {type: String} 			// username
			 }],								
	posts: [{type: ObjectId, ref: 'Post'}],
	owner: {type: ObjectId, ref: 'User'},
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



sphereSchema.virtual('ids').get(function(){
  var ids = [];
  for(var i = 0; i< this.members.length ; i++){
      var memberId = this.members[i].id;
      ids.push(memberId);
  }
  return ids;
});




sphereSchema.methods.link = function(ENV){
	if(ENV == "production"){
	  return "http://dropsphere.herokuapp.com/invite/" + this.id;	
	}
	return "http://localhost:3500/invite/" + this.id;
};

// saves post for all users in a sphere 
sphereSchema.statics.savePost = function(User, sphereID, post, next){
	this.findOne({_id: sphereID}, function(err, sphere){
		 if(sphere){
          console.log("sphere found")
        
          post.fillViewers(sphere.members, function(filledPost){
            filledPost.save(function(err, msg){
              if(err){
                console.log(err);
              }

              if(msg){
                console.log("Post Saved: " + msg);
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
              User.update({$and: [{_id: member} , {'spheres.object': sphere._id}]}, {'$inc': {'spheres.$.updates' : 1}}, function(err){
                  if(err){console.log(err);}
                  else{
                    console.log("notifications updated");
                  }
              });
          } 
        } else{
        	console.log("Sphere not found");
        }

	});
};

module.exports = mongoose.model('Sphere', sphereSchema);