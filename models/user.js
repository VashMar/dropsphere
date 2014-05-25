var mongoose = require('mongoose'),
    validate = require('mongoose-validator').validate;
	bcrypt 	 = require('bcrypt'),
	SALT_WORK_FACTOR = 9;
    
var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

// validatons on object attributes 
var isEmail = validate({message: "This is not a valid email address"}, 'isEmail');
var nameValidator = [
                     validate({message: "Names must be between 3 and 20 characters "}, 'len', 3, 20), 
                     validate({message: "Names can only contain letters and numbers"}, 'isAlphanumeric')
                    ];
var passValidator = [validate({message: "Passwords must be more than 6 characters "}, 'len', 6)];


var userSchema = new Schema({
	name: { type: String, required: true, trim: true, validate: nameValidator },
	password: { type: String, required: true, validate: passValidator },
	email: { type: String, required: true, index: { unique: true }, validate: isEmail }, 
	sessions: [String], 
    spheres: [{
        object: {type: ObjectId, ref: 'Sphere'},      // references the sphere object user belongs to              
        nickname: {type: String},                    // references the users name in that sphere 
        joined: {type: Date, default: Date.now},    // when the user joined the sphere
        updates: {type: Number, default: 0}        // notification counter for each sphere 
        }],
    currentSphere: {type: Number, default: 0} // index of the user's current sphere 

});


userSchema.pre('save', function(next) {
    var user = this;

    for(var i=0; i< user.spheres.length; i++){
        if(user.spheres[i].nickname  == ""){
           user.spheres[i].nickname = user.name; 
        }
    }

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


// compares user submitted pass to saved salted one
userSchema.methods.comparePassword = function(sentPassword, callback) {
    bcrypt.compare(sentPassword, this.password, function(err, isMatch){
        if (err) return cb(err);
        callback(null, isMatch);
    });
};

// checks if user is a member of a given sphere 
userSchema.methods.isMember = function(sphere){
 
    var isMember = false;

    for(var i = 0; i < this.spheres.length; i++){
        if(sphere.id == this.spheres[i].object){
               isMember = true;
        }
    }

    return isMember; 
}

// returns the information about all clients spheres with one loop
userSchema.methods.sphereData = function(ENV){

    var sphereData = {},
        sphereMap = {};
        sphereNames = [];
        totalUpdates = 0;
        index = this.currentSphere;
        link = "";

    for(var i = 0; i < this.spheres.length ; i++){

        var sphere = this.spheres[i];             
        var sphereName = this.spheres[i].object.name;

        // get the updates on all spheres       
        totalUpdates += sphere.updates;

        // set invite link depending on environment (cannot call sphere.link on an objectid so code had to go in here)
        if(ENV == "production"){
            link = "http://dropsphere.herokuapp.com/invite/" + sphere.object.id; 
        }else{
            link = "http://localhost:3500/invite/" + sphere.object.id;
        }
       

        // build the spheremap of the users spheres 
         sphereMap[sphereName] = { id: sphere.object._id, 
                                    nickname: sphere.nickname, 
                                    link: link,
                                    updates: sphere.updates
                                };

        sphereNames.push(sphereName);

    }

    sphereData["sphereMap"] = sphereMap;
    sphereData["sphereNames"] = sphereNames;
    sphereData["totalUpdates"] = totalUpdates;


    return sphereData; 

}

// check if post belongs to user
userSchema.methods.isOwner = function(post){
    if(post.creator === this._id){
        console.log("Post belongs to current user");
        return true;
    }

    return false; 
}

// retrieves the date user joined the current sphere 
userSchema.methods.joinedCurrent = function(){
  return this.spheres[this.currentSphere].joined;    
}

userSchema.methods.endSession = function(sessionID){
  console.log("Exiting Session " + sessionID + " in session list: " + this.sessions);
  this.sessions.splice(this.sessions.indexOf(sessionID), 1);
  console.log("Remaining sessions " + this.sessions);
}

userSchema.statics.load = function(sessionID, next){
    console.log("Loading Current User.. " + sessionID);
    this.findOne({sessions: {$in : [sessionID]}}, function(err, user){
        if(err || !user){
            next(err);
        } else{
            console.log("User found..");
            next(false, user);
        }
    });
}



module.exports = mongoose.model('User', userSchema);