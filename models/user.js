var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	name: String,
	password: String,
	email: String, 
	session: String, 
    spheres: Array
});