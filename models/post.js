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
	viewers: [{
		id: {type: String},
		name: {type: String},
		seenChat: {type: Boolean, default: true},
		seenPost: {type:Boolean, default: false}
	}],
	isLink: {type: Boolean, default: false},
	messages: [{type: ObjectId, ref: 'Message'}]
});


// check if the message item is a link before saving 
postSchema.pre('save', function(next){
	var content = this.contentData;
	if(content.url || content.thumbnail || content.image ){
		this.isLink = true;
	}
	
	next();
});


postSchema.methods.creatorName = function(){
	return this.creator.name; 
}


postSchema.methods.hasChat = function(){
   if(this.messages.length > 0){
   		return true;
   }
   return false; 
}

// returns a list of users who've viewed the post
postSchema.methods.getViewers = function(){
	var viewers = this.viewers;
	var viewerList = [];
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].seenPost === true){
			viewerList.push(viewers[v].name);
		}
	}

	return viewerList;
}

// returns whether a user has seen the post's chat or not 
postSchema.methods.hasSeenChat = function(userID){
	var viewers = this.viewers;
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
postSchema.methods.viewedPost = function(userID,name){
	var viewers = this.viewers;
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			console.log("Post viewed by:  " + name);
			viewers[v].seenPost = true;
			viewers[v].name = name;
		}
	}

}

// marks a post's chat as seen by a specific user 
postSchema.methods.chatSeen = function(userID){
	var viewers = this.viewers;
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			viewers[v].seenChat = true;
		}
	}
}

postSchema.methods.updatedChat = function(senderID){
	var viewers = this.viewers;
	console.log(senderID);
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id != senderID){
			viewers[v].seenChat = false;	
		};
	}
}


postSchema.methods.fillViewers = function(members, next){
	console.log(members);
	
	for(var m = 0; m < members.length; m++){
		this.viewers.push({id: members[m].id })
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

postSchema.methods.getPostData = function(user, isMobile){

	var postContent = isMobile == "true" ? this.contentData : this.content;

 	return {sender: this.creatorName(), 
 			content: this.contentData, 
 			isOwner: this.ownedBy(user._id), 
 			isLink: this.isLink, 
 			postTime: moment(this.date).format(), 
 			seen: this.hasSeenChat(user.id),
 			viewers: this.getViewers()
 		};
}



postSchema.statics.seenChat = function(postID, userID){

	this.update({$and: [{_id: postID},{'viewers.id': userID}] }, {'$set': {'viewers.$.seenChat' : true}}, function(err, numAffected){
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