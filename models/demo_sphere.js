var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var demosphereSchema = mongoose.Schema({
	members: [String],
	messages: [{type: ObjectId, ref: 'Message'}]
});


module.exports = mongoose.model('Demosphere', demosphereSchema);