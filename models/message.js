var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var messageSchema = mongoose.Schema({
	text: String,
	date: {type: Date, default: Date.now },
	sender: String,
	isLink: {type: Boolean, default: false},
	hasTags: {type:Boolean, default: false}
});


// check if the message item is a link before saving 
messageSchema.pre('save', function(next){
	var message = this.text;

	if(message.indexOf("<a") == 0 || message.indexOf("<img") == 0 || message.indexOf("<iframe") == 0){
		this.isLink = true;
	}
	
	next();
});




module.exports = mongoose.model('Message', messageSchema);