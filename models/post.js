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




module.exports = mongoose.model('Post', postSchema);