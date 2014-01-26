var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: [{type: ObjectId, ref: 'User'}],
	messages: [{type: ObjectId, ref: 'Message'}],
	owner: {type: ObjectId, ref: 'User'}

});


module.exports = mongoose.model('Sphere', sphereSchema);