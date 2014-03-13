var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var postSchema = mongoose.Schema({
	content: String,
	date: {type: Date, default: Date.now },
	creator: {type: ObjectId, ref: 'User'},
	isLink: {type: Boolean, default: false},
	messages: [{type: ObjectId, ref: 'Message'}]
});


// check if the message item is a link before saving 
postSchema.pre('save', function(next){
	var message = this.content;

	if(message.indexOf("<a") == 0 || message.indexOf("<img") == 0 || message.indexOf("<iframe") == 0){
		this.isLink = true;
	}
	
	next();
});




module.exports = mongoose.model('Post', postSchema);