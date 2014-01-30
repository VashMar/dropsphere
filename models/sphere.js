var mongoose = require('mongoose')

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: [String],					// list of all the member names in a sphere 
	messages: [{type: ObjectId, ref: 'Message'}],
	owner: {type: ObjectId, ref: 'User'},
});

sphereSchema.virtual('link').get(function(){
	return "http://localhost:3500/invite/" + this.id;
})


module.exports = mongoose.model('Sphere', sphereSchema);