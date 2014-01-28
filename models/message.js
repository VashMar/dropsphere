var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var messageSchema = mongoose.Schema({
	text: String,
	type: String,
	date: {type: Date, default: Date.now },
	sender: String

});

module.exports = mongoose.model('Message', messageSchema);