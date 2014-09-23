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
			shared: {type: ObjectId, ref: 'Post'}
		}]
	}],
	// messages: [{type: ObjectId, ref: 'Message'}]
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
	this.locations.push({sphere: sphereID, title: this.contentData.title, name: sphereName});
}


// find a post location based on sphere id
postSchema.methods.findLoc = function(sphereID){
	var locs = this.locations;
	var loc = false;

	for(var i = 0; i < locs.length; i++){
		if(locs[i].sphere == sphereID){
			loc = locs[i];
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

// adds a message to a a conversation involving this post at a certain sphere location
postSchema.methods.addMessage = function(message, sphereID){
	var loc = this.findLoc(sphereID);

	loc.messages.push(message);

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

// returns whether a user has seen the post's chat or not 
postSchema.methods.hasSeenChat = function(userID, viewers){
	console.log(viewers);
	console.log("USERID: " + userID);
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			console.log("VIEWERID: " + viewers[v].id + ": " + viewers[v].seen);
			return viewers[v].seenChat;
		}
	}
	return false; 
}


// marks a post as seen by a specific user 
postSchema.methods.viewedPost = function(userID, name, sphereID){

	var loc = this.findLoc(sphereID);
	var viewers = loc.viewers;

	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			console.log("Post viewed by:  " + name);
			viewers[v].seenPost = true;
			viewers[v].name = name;
		}
	}

}

// marks a post's chat as seen by a specific user 
postSchema.methods.chatSeen = function(userID, sphereID){

	var loc = this.findLoc(sphereID);
	var viewers = loc.viewers;

	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			viewers[v].seenChat = true;	
			console.log("Chat marked as seen")
		}
	}
}

postSchema.methods.updatedChat = function(senderID, sphereID){

	var loc = this.findLoc(sphereID);
	var viewers = loc.viewers;

	console.log(senderID);
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id != senderID){
			viewers[v].seenChat = false;	
		}
	}
}

// stores all the users that could potentially view the post 
postSchema.methods.fillViewers = function(members, sphereID, sphereName, next){
	console.log(members);

	// get post location
	var loc = this.findLoc(sphereID);

	console.log(loc);

	// fill viewers at location with the sphere members 
	for(var m = 0; m < members.length; m++){
		loc.viewers.push({id: members[m].id }); 
	}
		

	console.log("Post viewers filled: "  + this.locations);

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
	var viewers =  this.getViewers(sphereID);
	console.log("The viewers in this sphere: " + viewers);
 	return {sender: this.creatorName(), 
 			content: this.contentData, 
 			isOwner: this.ownedBy(user._id), 
 			isLink: this.isLink, 
 			postTime: moment(this.date).format(), 
 			viewers: this.getViewed(viewers),
 			seen: this.hasSeenChat(user.id, viewers)
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


module.exports = mongoose.model('Post', postSchema);