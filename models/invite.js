var mongoose = require('mongoose');

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;


var inviteSchema = mongoose.Schema({
	token: String,
	date: {type: Date, default: Date.now },
	sender: {type: ObjectId, ref: 'User'},
});



module.exports = mongoose.model('Invite', inviteSchema);