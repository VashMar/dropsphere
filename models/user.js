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
    mainSphere: {type:ObjectId, ref:'Sphere'}, // the users main sphere 
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
    console.log(this.spheres);

   return this.spheres[this.currentSphere];
};

// compares user submitted pass to saved salted one
userSchema.methods.comparePassword = function(sentPassword, callback) {
    bcrypt.compare(sentPassword, this.password, function(err, isMatch){
        if (err) return cb(err);
        callback(null, isMatch);
    });
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

// retrieve the contact names and their mainsphere
userSchema.methods.getContacts = function(next){

    var contacts = this.contacts;
    var contactInfo = {};
    for(var i = 0; i < contacts.length; i++){
        console.log("adding contact for retrieval");
        contactInfo[contacts[i].id] = contacts[i].name; 
    }

    next(contactInfo); 
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
        sphereMap = {},
        sphereIDs = [],
        totalUpdates = 0,
        index = this.currentSphere,
        link = "";

    for(var i = 0; i < this.spheres.length ; i++){

        var sphere = this.spheres[i],             
            sphereName = sphere.object.getName(this.id),
            sphereID = sphere.object.id,
            type = sphere.object.type,
            isOwner = sphere.object.owner == this.id;

        console.log("Sphere id: " + sphere.object.owner);
        console.log("User id " + this.id);

        // get the updates on all spheres       
        totalUpdates += sphere.updates;

        // set invite link depending on environment 
        if(ENV == "production"){
            link = "http://dropsphere.herokuapp.com/invite/" + sphereID; 
        }else{
            link = "http://localhost:3500/invite/" + sphereID;
        }
       

        // add each sphere to the sphereMap for client side tracking 
        sphereMap[sphereID] = {name: sphereName, 
                                nickname: sphere.nickname, 
                                link: link,
                                updates: sphere.updates,
                                type: type,
                                isOwner: isOwner
                                };

        sphereIDs.push(sphereID);

    }

    sphereData["sphereMap"] = sphereMap;
    sphereData["sphereIDs"] = sphereIDs;
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

userSchema.methods.removeSphere = function(sphereID){
    for(var i =0; i < this.spheres.length; i++){
        var sphere = this.spheres[i];
        if(sphere.object == sphereID){
            this.spheres.splice(i, 1);
        }
    }

    this.save(function(err, user){
        if(user){
          console.log("Sphere removed from user's list");
        }
    });
}

userSchema.statics.load = function(sessionID, next){
    console.log("Loading Current User.. " + sessionID);
    this.findOne({sessions: {$in : [sessionID]}}).populate('mainSphere').exec(function(err, user, mainSphere){
        if(err || !user){
            next(err);
        } else{
            console.log("User found..");
            next(false, user, user.mainSphere);
        }
    });
}


userSchema.statics.reload = function(userID, next){
    this.findOne({_id: userID}, function(err, user){
        if(user){
            console.log("current user reloaded");
            next(user);
        }else{
            next(false);
        }
    });
}

// update the contact list of sphere members when a new user joins the sphere
userSchema.statics.updateMemberContacts = function(members, user){
    console.log("Updating Contact List of other sphere members..");
    this.find({_id: {$in: members}}, function(err, docs){
        console.log(docs);
        for(var i = 0; i < docs.length; i++){
            var member = docs[i];
            var contactList = member.contacts; // current contactList of a given sphere member 
            // add the user to the member's contact list if he/she doesn't already exist in it and the user is not the member
            if(contactList.indexOf(user._id) < 0 && member.id != user.id){ 
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

userSchema.statics.deleteSphere = function(sphereID){
    this.find({'spheres.object':sphereID}, function(err, users){
        for(var i = 0; i < users.length; i++){
            var user = users[i];
            user.removeSphere(sphereID);
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