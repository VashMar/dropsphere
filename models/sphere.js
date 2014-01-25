var mongoose = require('mongoose');

var sphereSchema = mongoose.Schema({
	name: String,
	members: Array,
	messages: Array,
	owner: String

});