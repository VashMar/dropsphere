var mongoose = require('mongoose');

var demosphereSchema = mongoose.Schema({
	members: [String],
	messages: [{type: ObjectId, ref: 'Message'}]
});


module.exports = mongoose.model('Demosphere', demosphereSchema);