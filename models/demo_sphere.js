var mongoose = require('mongoose');

var demosphereSchema = mongoose.Schema({
	members: Array,
	messages: Array
});


module.exports = mongoose.model('Demosphere', demosphereSchema);