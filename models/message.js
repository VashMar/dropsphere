var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var messageSchema = mongoose.Schema({
	text: String,
	type: String,
	date: {type: Date, default: Date.now },
	owner: {type: ObjectId, ref: 'User'},
	sphere: {type: ObjectId, ref: 'Sphere'} 

});

module.exports = mongoose.model('Message', messageSchema);