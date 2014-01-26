var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
	text: String,
	type: String,
	owner: String,
	sphere: String 

});

module.exports = mongoose.model('Message', messageSchema);