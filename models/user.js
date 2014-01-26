var mongoose = require('mongoose'),
    validate = require('mongoose-validator').validate;
	bcrypt 	 = require('bcrypt'),
	SALT_WORK_FACTOR = 9;
    
var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

// validatons on object attributes 
var isEmail = validate({message: "Email is invalid"}, 'isEmail');
var nameValidator = [validate({message: "Names must be between 3 and 20 characters "}, 'len', 3, 20), 
                    validate(validate({message: "Names can only contain letters and numbers"}, 'isAlphanumeric')];
var passValidator = [validate({message: "Passwords must be between 6 and 20 characters "}, 'len', 6, 20)];


var userSchema = new Schema({
	name: { type: String, required: true, validate: nameValidator },
	password: { type: String, required: true, validate: passValidator },
	email: { type: String, required: true, index: { unique: true }, validate: email }, 
	session: String, 
    spheres: [{type: ObjectId, ref: 'Sphere'}],
    spherenames: [{type: String}]

});



userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password along with our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});


userSchema.methods.comparePassword = function(sentPassword, callback) {
    bcrypt.compare(sentPassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        callback(null, isMatch);
    });
};


module.exports = mongoose.model('User', userSchema);