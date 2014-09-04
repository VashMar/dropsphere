var mongoose = require('mongoose'),
    validate = require('mongoose-validator');
	bcrypt 	 = require('bcrypt'),
	SALT_WORK_FACTOR = 9;
  

    
var Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;



// validatons on object attributes 
var isEmail = validate({
                validator: 'isEmail',
                message: "This is not a valid email address"
              });

var nameValidator = [
                     validate({
                        validator: 'isLength',
                        arguments: [3,20],
                        message: "Names must be between 3 and 20 characters "}), 
                     validate({
                        validator: 'isAlphanumeric',
                        message: "Names can only contain letters and numbers"})
                    ];
var passValidator = [
                    validate({
                        validator: 'isLength',
                        arguments: 6,
                        message: "Passwords must be more than 6 characters "})
                    ];


var userSchema = new Schema({
	name: { type: String, required: true, unique:true, trim: true, validate: nameValidator },
	password: { type: String, required: true, validate: passValidator },
	email: { type: String, required: true, index: { unique: true }, validate: isEmail }, 
	sessions: [String], 
    spheres: [{
        object: {type: ObjectId, ref: 'Sphere'},      // references the sphere object user belongs to              
        nickname: {type: String},                    // references the users name in that sphere 
        joined: {type: Date, default: Date.now},    // when the user joined the sphere
        updates: {type: Number, default: 0}        // notification counter for each sphere 
        }],
    currentSphere: {type: Number, default: 0}, // index of the user's current sphere 
    contacts: [{type: ObjectId, ref: 'User'}]
});


userSchema.path('email').validate(function(value, respond){
    var self = this;
    this.constructor.findOne({email: value}, function(err, user){
        if(err) throw err;
        if(user) {
            if(self.id === user.id) return respond(true);
            return respond(false);
        }
        respond(true);
    });
}, "This email address is already in use. <a href='#''>Forgot Password?</a>");

userSchema.path('name').validate(function(value, respond){
    var self = this;
    this.constructor.findOne({name: value}, function(err, user){
        if(err) throw err;
        if(user) {
            if(self.id === user.id) return respond(true);
            return respond(false);
        }
        respond(true);
    });
}, "Uh oh, looks like this username is taken");




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


userSchema.methods.targetSphere = function(){
   return this.spheres[this.currentSphere];
};

// compares user submitted pass to saved salted one
userSchema.methods.comparePassword = function(sentPassword, callback) {
    bcrypt.compare(sentPassword, this.password, function(err, isMatch){
        if (err) return cb(err);
        callback(null, isMatch);
    });
};


userSchema.methods.addContact = function(contact){

};

// auto adds new contacts on sphere join 
userSchema.methods.addSphereContacts = function(contactIds, next){
   var contacts =  this.contacts;
   var ObjectID = mongoose.Types.ObjectId;
   console.log(contacts);
   for(var i =0; i < contactIds.length; i++){
        var contact = ObjectID(contactIds[i]);
        if(contacts.indexOf(contact) < 0 && contact != this.id){
            console.log("New contact being added..");
            contacts.push(contact);
        }
    }

    next(contactIds);
};

// retrieve the contact names and ids
userSchema.methods.getContacts = function(){
    var contacts = this.contacts;
    var contactInfo = {};
    for(var i = 0; i < contacts.length; i++){
        contactInfo[contacts[i].id] = contacts[i].name; 
    }

    return contactInfo; 
}

// checks if user is a member of a given sphere 
userSchema.methods.isMember = function(sphere){
 
    var isMember = false;

    for(var i = 0; i < this.spheres.length; i++){
        if(sphere.id == this.spheres[i].object){
               isMember = true;
        }
    }

    return isMember; 
};

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

userSchema.statics.updateMemberContacts = function(members, user){
    console.log("Updating Contact List of other sphere members..");
    this.find({_id: {$in: members}}, function(err, docs){
        console.log(docs);
        for(var i = 0; i < docs.length; i++){
            var member = docs[i];
            var contactList = member.contacts;
            if(contactList.indexOf(user._id) < 0 && member != user){
                contactList.push(user);
                member.save(function(err){
                    if(err){
                        console.log(err);
                    }else{
                        console.log("Sphere member contact list updated");
                    }
                });
            }
        }
    });
}

User = mongoose.model('User', userSchema);
module.exports = User;


/* User.schema.path('name').validate(function (value, respond) {                                                                                           
    User.findOne({ name: value }, function (err, user) {       
        user ? respond(false) : respond(true);                                                                                                                                                                                                          
    });                                                                                                                                                  
}, 'This username is already taken'); */