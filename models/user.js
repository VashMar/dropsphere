var mongoose = require('mongoose'),
	bcrypt 	 = require('bcrypt'),
	SALT_WORK_FACTOR = 9;

var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var userSchema = new Schema({
	name: { type: String, required: true },
	password: { type: String, required: true },
	email: { type: String, required: true, index: { unique: true } }, 
	session: String, 
    spheres: [{type: ObjectId, ref: 'Sphere'}]
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