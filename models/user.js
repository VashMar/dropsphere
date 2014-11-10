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
    contacts: [{type: ObjectId, ref: 'User'}],
    requests: [{type: ObjectId, ref: 'User'}],
    invites: [{
        sphereID: String,
        sphereName: String,
        sender:  String
        }],
    newRequests: {type:Number, default: 0},
    passReset: {
                 token: {type:String},
                 created: {type:Date}
                }
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

userSchema.methods.addContact = function(user){
    this.contacts.push(user);
}

userSchema.methods.pendingRequest = function(user){
     if(this.contacts.indexOf(user.id) < 0){
        this.requests.push(user);
        this.newRequests++;
     }
}

userSchema.methods.pendingInvite = function(sphereID, sphereName, sender){
        this.invites.push({sphereID: sphereID, sphereName: sphereName, sender:sender});
        this.newRequests++;
        console.log("Pending invite added");
}

userSchema.methods.requestsSeen = function(){
    this.newRequests = 0;
}

userSchema.methods.removeRequest = function(user){
    console.log(this.requests);
    this.requests.splice(this.requests.indexOf(user), 1);
    console.log(this.requests);
}

userSchema.methods.removeInvite = function(sphereID){
    var invites = this.invites;
    console.log("Removing invite " + sphereID + "from: " +  invites);
    for(var i = 0; i < this.invites.length; i++){
        if(invites[i].sphereID == sphereID){
            invites.splice(i,1);
            console.log("Invite Removed");
        }
    }
    console.log("Updated Invites:" + invites);
}

userSchema.methods.hasContact = function(user){
    if(this.contacts.indexOf(user.id) > 0){
        console.log("Contact already exists");
        return true;
    }
    return false;
}

userSchema.methods.setNick = function(sphereID, nickname){
    this.spheres.forEach(function(sphere){
        if(sphere.object == sphereID){
            sphere.nickname = nickname;
            console.log("User side sphere nickname updated");
        }
    });
}

userSchema.methods.targetSphere = function(){
   var current = this.spheres[this.currentSphere] || 0; 
   return current;
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

// retrieve the contact names and ids with requests and invites
userSchema.methods.getContactInfo = function(next){
    var user = this;
    var contacts = user.contacts;
    var contactInfo = {};

    user.getRequests(function(requestInfo){

        user.getInvites(function(inviteInfo){
           for(var i = 0; i < contacts.length; i++){
                console.log("adding contact for retrieval");
                contactInfo[contacts[i].id] = contacts[i].name; 
            }

              next(contactInfo, requestInfo, inviteInfo); 
        });
      
    });
}

// retrieve the names and ids of user's with pending friend requests
userSchema.methods.getRequests = function(next){
    var requests = this.requests;
    requestInfo = {};
    requests.forEach(function(request){
        requestInfo[request.id] = request.name;
    });

    next(requestInfo);
}


userSchema.methods.getInvites = function(next){
    var invites = this.invites;
    inviteInfo = {};
    invites.forEach(function(invite){
        inviteInfo[invite.sphereID] = [invite.sphereName, invite.sender]; 
    });

    next(inviteInfo);
}

// checks if user is a member of a given sphere 
userSchema.methods.isMember = function(givenSphere){
 
    var isMember = false;

    this.spheres.forEach(function(sphere){
        if(givenSphere.id == sphere.object){
            isMember = true;
        }
    });

    return isMember; 
};

// returns the information about all clients spheres with one loop
userSchema.methods.sphereData = function(ENV){
    var user = this;

    var sphereData = {},
        sphereMap = {},
        sphereIDs = [],
        totalUpdates = 0,
        index = this.currentSphere,
        link = "";
   
    user.spheres.forEach(function(sphere){

        var sphereName = sphere.object.getName(user.id),
            sphereID = sphere.object.id,
            type = sphere.object.type,
            isOwner = sphere.object.owner == user.id;

        console.log("Sphere id: " + sphere.object.owner);
        console.log("User id " + user.id);

        // get the updates on all spheres       
        totalUpdates += sphere.updates;

        // set invite link depending on environment 
        if(ENV == "production"){
            link = "http://www.dropsphere.com/invite/" + sphereID; 
        }else{
            link = "http://localhost:3500/invite/" + sphereID;
        }
        
        var empty = type == "Personal" && sphere.object.posts.length < 1;

        if(sphereIDs.indexOf(sphereID) < 0){
            sphereIDs.push(sphereID);

            if(!empty){
                // add each sphere to the sphereMap for client side tracking 
                sphereMap[sphereID] = {name: sphereName, 
                                        nickname: sphere.nickname, 
                                        link: link,
                                        updates: sphere.updates,
                                        type: type,
                                        isOwner: isOwner
                                        };
            }
        }
    });

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