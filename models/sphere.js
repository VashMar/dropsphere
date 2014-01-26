var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: Array,
	messages: Array,
	owner: String

});


module.exports = mongoose.model('Sphere', sphereSchema);