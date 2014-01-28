var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var messageSchema = mongoose.Schema({
	full: String, 
	text: String,
	date: {type: Date, default: Date.now },
	sender: String

});

module.exports = mongoose.model('Message', messageSchema);