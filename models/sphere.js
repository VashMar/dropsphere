var mongoose = require('mongoose')

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var sphereSchema = mongoose.Schema({
	name: String,
	members: [{ 					// list of all the member names in a sphere 
			  id: {type: String },
			  nickname: {type: String , default: ""},
			  name:  {type: String} 			
			 }],								
	messages: [{type: ObjectId, ref: 'Message'}],
	owner: {type: ObjectId, ref: 'User'},
});

sphereSchema.virtual('link').get(function(){
	return "http://localhost:3500/invite/" + this.id;
});

sphereSchema.virtual('nicknames').get(function(){
	var nicknames = [];
	for(var i = 0; i< this.members.length ; i++){
		var nickname = this.members[i].nickname.trim();
		if(nickname === "" ){
			nicknames.push(this.members[i].name);
		}else{
			nicknames.push(nickname);	
		}
	}

	return nicknames;

});

module.exports = mongoose.model('Sphere', sphereSchema);