var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var moment = require("moment");
var postSchema = mongoose.Schema({
	content: String,			
	contentData: {
		url: {type: String, default: ""},
		thumbnail: {type: String, default: ""},
		image: {type: String, default: ""},
		title: {type: String, default: ""},
	},
	date: {type: Date, default: Date.now },
	creator: {
		object: {type: ObjectId, ref: 'User'},
		name: {type: String}
		},
	isLink: {type: Boolean, default: false},
	locations: [{   // tracks all the locations of this post 
		sphere: {type:String},  // the sphere id of the shared post 
		title: {type: String},	// the title of the post at this location 
		messages: [{type: ObjectId, ref: 'Message'}], // the conversation involving the post at this location 
		name: String,		// name of the sphere 
		viewers: [{			// the viewers of this post at this location 
			id: {type: String},
			name: {type: String},
			seenChat: {type: Boolean, default: true},
			seenPost: {type:Boolean, default: false},
			minimized: {type:Boolean, default: false},
		}],
		tags: [String]
	}],
	sphere: {
			 id: {type:String}, 		// the sphere id of the shared post 
			 name: {type:String}
			},  
	messages: [{type: ObjectId, ref: 'Message'}], // the conversation involving the post at this location 
	viewers: [{			// the viewers of this post at this location 
		id: {type: String},
		name: {type: String},
		seenChat: {type: Boolean, default: true},
		seenPost: {type:Boolean, default: false},
		minimized: {type:Boolean, default: false},
	}],
	tags: [String]
});


// check if the message item is a link before saving 
postSchema.pre('save', function(next){
	var content = this.contentData;
	if(content.url || content.thumbnail || content.image ){
		this.isLink = true;
	}
	
	next();
});


// add a location to the post 
postSchema.methods.addLoc = function(sphereID, sphereName){
	//this.locations.push({sphere: sphereID, title: this.contentData.title, name: sphereName});
	this.sphere.id = sphereID;
	this.sphere.name = sphereName;
	this.save(function(err,post){
		if(!err && post){
			console.log("Post and sphere sync'd");
		}
	});
}

postSchema.methods.removeLoc = function(sphereID){
	var locs = this.locations;

	for(var i =0; i < locs.length; i++){
		if(locs[i].sphere == sphereID){
			locs.splice(i, 1);
		}
	}


	this.save(function(err, post){
		if(post){
			if(post.locations.length < 1 ){
				post.remove(function(err){
					if(!err){
						console.log("post removed");
					}
				});
			}
		}
	});
}

// find a post location based on sphere id
postSchema.methods.findLoc = function(sphereID){
	var currPost = this;
	var locs = this.locations;
	var loc = false;

	for(var i = 0; i < locs.length; i++){
		if(locs[i].sphere == sphereID){
			loc = locs[i];

			/* if(i == 0){
				console.log("Transferring sphere data onto post..");
				currPost.sphere.id = loc.sphere;
				currPost.sphere.name = loc.name;
				currPost.viewers = loc.viewers;
				currPost.messages = loc.messages;
				currPost.tags = loc.tags;
				currPost.save(function(err,post){
					if(err){
						console.log(err);
					}else{
						console.log("post sphere data transferred.." + post.sphere);
					}
				});
			} */
			break; 
		}
	}

	return loc; 
}

// retrieves a location asynchronously 
postSchema.methods.getLoc = function(sphereID, next){
	var loc = this.findLoc(sphereID);
	next(loc);
}

postSchema.methods.addTags = function(sphereID, tags, next){
	if(tags){
		var post = this;
		var addedTags = [];

		if(tags.constructor === Array){
				for(var i = 0; i < tags.length; i++){
					var tag = tags[i];
					if(this.tags.indexOf(tag) < 0){
						console.log("pushing tag..");
						this.tags.push(tag);
						addedTags.push(tag);
					}

					if(i == tags.length -1 ){
						next(addedTags);
					}
				}
		}else{
			var tag = tags;
			if(this.tags.indexOf(tag) < 0){
				console.log("pushing tag..");
				this.tags.push(tag);
				addedTags.push(tag);
				next(addedTags);
			}
		}


		/*post.getLoc(sphereID, function(loc){
			if(tags.constructor === Array){
				for(var i = 0; i < tags.length; i++){
					var tag = tags[i];
					if(loc.tags.indexOf(tag) < 0){
						console.log("pushing tag..");
						loc.tags.push(tag);
						addedTags.push(tag);
					}

					if(i == tags.length -1 ){
						next(addedTags);
					}
				}
			}else{
				var tag = tags;
				if(loc.tags.indexOf(tag) < 0){
					console.log("pushing tag..");
					loc.tags.push(tag);
					addedTags.push(tag);
					next(addedTags);
				}
			}
		}); */
	}else{
		next("");
	} 

}

postSchema.method.getTags = function(sphereID){
	return this.tags;
}

// adds a message to a a conversation involving this post at a certain sphere location
postSchema.methods.addMessage = function(message, sphereID){
	//var loc = this.findLoc(sphereID);

	this.messages.push(message);

	this.save(function(err, post){
		if(post){
			console.log("Message added to post");
		}
	});
}

postSchema.methods.creatorName = function(){
	return this.creator.name; 
}



// returns a list of the viewers at the given sphere ID 
postSchema.methods.getViewers = function(sphereID){

	var viewers = [];
	var loc = this.findLoc(sphereID);

	if(loc){
		viewers = loc.viewers;
	}	

	return viewers;
}


// returns if the post has a conversation or not 
postSchema.methods.hasMessages = function(sphereID){

	var loc = this.findLoc(sphereID);

	if(loc && loc.messages.length > 0){
		return true; 
	}	

	return false;
}


// returns a list of users who have viewed the post at the given location 
postSchema.methods.getViewed = function(viewers){


	var viewedList = [];

	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].seenPost === true){
			viewedList.push(viewers[v].name);
		}
	}
	
	console.log(viewedList)
	return viewedList;

}

// returns if a post is minimized
postSchema.methods.isMini = function(userID, viewers){
	for(var v = 0; v < this.viewers.length; v++){
		if(this.viewers[v].id == userID){
			return this.viewers[v].minimized;
		}
	}
}

postSchema.methods.minimize = function(userID, sphereID){
	var loc = this.findLoc(sphereID);
	var viewers = loc.viewers; 
	for(var v=0; v < this.viewers.length;  v++){
		if(this.viewers[v].id == userID){
			this.viewers[v].minimized = true; 
			console.log("Post minimized");
		}
	}
}

postSchema.methods.maximize = function(userID, sphereID){
	//var loc = this.findLoc(sphereID);
	var viewers = this.viewers; 
	

	for(var v=0; v < viewers.length;  v++){
		if(viewers[v].id == userID){
			viewers[v].minimized = false; 
			console.log("Post maximized");
		}
	}
}



// returns whether a user has seen the post's chat or not 
postSchema.methods.hasSeenChat = function(userID, viewers, hasMessages){

	for(var v = 0; v < this.viewers.length; v++){
		if(this.viewers[v].id == userID && hasMessages){
			return this.viewers[v].seenChat;
		}
	}
	return true; 
}




// marks a post as seen by a specific user 
postSchema.methods.viewedPost = function(userID, name, sphereID){
	console.log("Viewed post in sphere: " + sphereID);
	//var loc = this.findLoc(sphereID);
	//var viewers = loc.viewers;

	for(var v = 0; v < this.viewers.length; v++){
		if(this.viewers[v].id == userID){
			console.log("Post viewed by:  " + name);
			this.viewers[v].seenPost = true;
			this.viewers[v].name = name;
		}
	}

}

// marks a post's chat as seen by a specific user 
postSchema.methods.chatSeen = function(userID, sphereID){

	//var loc = this.findLoc(sphereID);
	//var viewers = loc.viewers;

	for(var v = 0; v < this.viewers.length; v++){
		if(this.viewers[v].id == userID){
			this.viewers[v].seenChat = true;	
			console.log("Chat marked as seen")
		}
	}
}

postSchema.methods.updatedChat = function(senderID, sphereID){

	//var loc = this.findLoc(sphereID);
	//var viewers = loc.viewers;

	for(var v = 0; v < this.viewers.length; v++){
		if(this.viewers[v].id != senderID){
			console.log("Chat marked as unseen");
			this.viewers[v].seenChat = false;	
		}
	}
}

// stores all the users that could potentially view the post 
postSchema.methods.fillViewers = function(members, sphereID, sphereName, next){

	// get post location
	//var loc = this.findLoc(sphereID);

	// fill viewers at location with the sphere members 
	for(var m = 0; m < members.length; m++){
		this.viewers.push({id: members[m].id }); 
	}
	
	next(this); 

}

postSchema.methods.ownedBy = function(userID){
	var creatorID = String(this.creator.object);
	if(creatorID  == userID){
		 console.log("Post belongs to current user");
		 return true;
	}

	return false;
}

postSchema.methods.getPostData = function(user, sphereID, isMobile){

	var postContent = isMobile == "true" ? this.contentData : this.content;
	//var loc = this.findLoc(sphereID);
	//var viewers =  this.getViewers(sphereID);
	var hasMessages = this.messages.length > 0;
	// var tags = loc.tags || [];
 	return {sender: this.creatorName(), 
 			content: this.contentData, 
 			isOwner: this.ownedBy(user._id), 
 			isLink: this.isLink, 
 			postTime: moment(this.date).format(), 
 			viewers: this.getViewed(this.viewers),
 			seen: this.hasSeenChat(user.id, this.viewers, hasMessages),
 			minimized: this.isMini(user.id, this.viewers),
 			tags: this.tags
 		};
}



postSchema.statics.seenChat = function(postID, userID, sphereID){

	this.update({$and: [{_id: postID},{'locations.sphere': sphereID}, {'locations.viewers.id': userID}] }, {'$set': {'viewers.$.seenChat' : true}}, function(err, numAffected){
          if(err){console.log(err);}

          else{
            console.log(numAffected);
          }
    });
}

postSchema.statics.delete = function(postID, userID){
	this.findOne({$and: [{_id: postID}, {'creator.object': userID}]}, function(err, post){
		if(post){
			post.remove();
			console.log("Post Deleted");
		}
	});
}

postSchema.statics.deleteSphere = function(sphereID){
   this.find({'locations.sphere': sphereID}, function(err, posts){
         for(var i = 0; i < posts.length; i++){
            var post = posts[i];
            post.removeLoc(sphereID);
        }
    });
}

postSchema.statics.transferData = function(){
	var Post = this;
	Post.find({}, function(err, posts){
		console.log("Posts found: " + posts.length);

		posts.forEach(function(post){

			var loc = post.locations[0];
			if(loc){
				console.log("Transferring sphere data onto post..");
				post.sphere.id = loc.sphere;
				post.sphere.name = loc.name;
				post.viewers = loc.viewers;
				post.messages = loc.messages;
				post.tags = loc.tags;
				post.save(function(err,saved){
					if(err){
						console.log(err);
					}else{
						console.log("post sphere data transferred.." + saved.viewers);
					}
				});
			}

			if(post.locations.length > 1){
				for(var i = 1; i < post.locations.length; i++){
					var newPostLoc = post.locations[i];

          			var postInfo = {content: post.content, 
                        creator: post.creator, 
                        contentData: post.contentData,
                        isLink: post.isLink,
                        viewers: newPostLoc.viewers,
                        messages: newPostLoc.messages,
                        tags: newPostLoc.tags
                    };				

					var newPost = new Post(postInfo);
					newPost.sphere.id = newPostLoc.sphere;
					newPost.sphere.name = newPostLoc.name;
					newPost.save(function(err,savedPost){
						if(savedPost){
							console.log("New Post copied for location");
						}else if(err){
							console.log(err);
						}
					});

					if(i == post.locations.length -1){
					  console.log("removing other locations");
					  post.locations.splice(1, post.locations.length);
					}
				}
			}
		});
	});
}

postSchema.statics.checkData = function(){
	this.find({}, function(err,posts){
		posts.forEach(function(post){
			if(!post.sphere){
				console.log("Post doesn't have sphere" + post);
			}else{
				console.log("Data successfully transferred");
			}
		});
	});
}

module.exports = mongoose.model('Post', postSchema);