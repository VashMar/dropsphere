var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var postSchema = mongoose.Schema({
	content: String,
	date: {type: Date, default: Date.now },
	creator: {
		object: {type: ObjectId, ref: 'User'},
		name: {type: String}
		},
	viewers: [{
		id: {type: String},
		seen: {type: Boolean, default: true}
	}],
	isLink: {type: Boolean, default: false},
	messages: [{type: ObjectId, ref: 'Message'}]
});


// check if the message item is a link before saving 
postSchema.pre('save', function(next){
	var message = this.content;

	if(message.indexOf("<a") > -1 || message.indexOf("<img") > -1 || message.indexOf("<iframe") > -1){
		this.isLink = true;
	}
	
	next();
});


postSchema.methods.creatorName = function(){
	return this.creator.name; 
}


postSchema.methods.hasConvo = function(){
   if(this.messages.length > 0){
   		return true;
   }
   return false; 
}

postSchema.methods.hasSeenConvo = function(userID){
	var viewers = this.viewers;
	console.log("USERID: " + userID);
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			console.log("VIEWERID: " + viewers[v].id + ": " + viewers[v].seen);
			return viewers[v].seen;
		}
	}
	return false; 
}

postSchema.methods.convoSeen = function(userID){
	var viewers = this.viewers;
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id == userID){
			viewers[v].seen = true;
		}
	}
}

postSchema.methods.updatedConvo = function(senderID){
	var viewers = this.viewers;
	console.log(senderID);
	for(var v = 0; v < viewers.length; v++){
		if(viewers[v].id != senderID){
			viewers[v].seen = false;	
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

postSchema.methods.getPostData = function(user){
 	return [this.creatorName(), this.content, user.isOwner(this), this.isLink, this.id, this.hasSeenConvo(user.id)];
}

postSchema.statics.seenConvo = function(postID, userID){

	this.update({$and: [{_id: postID},{'viewers.id': userID}] }, {'$set': {'viewers.$.seen' : true}}, function(err, numAffected){
          if(err){console.log(err);}

          else{
            console.log(numAffected);
          }
    });
}

module.exports = mongoose.model('Post', postSchema);