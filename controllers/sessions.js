

exports.render = function(res, layout, hash){
	console.log("Session rendering...");
	if(hash){
        console.log("rendering hash:" + hash);
		res.render(layout, { data: {
                    nickname:  hash.nickname,
                    username: hash.username,
                    nicknames: hash.nicknames,
                    feed: hash.feed, 
                    posts: hash.posts,
                    announcements: hash.announcements, 
                    sphereMap: hash.sphereMap,
                    sphereIDs: hash.sphereIDs,
                    currentSphere: hash.currentSphere,
                    totalUpdates: hash.totalUpdates,
                    contacts: hash.contacts,
                    requests: hash.requests,
                    newRequests: hash.newRequests
                }
           });       		

	 }else{
	 	res.render(layout);
	 }
	
}


exports.respondJSON = function(res, hash){
	console.log("Sending Session data as JSON...");
	if(hash){
		res.json(200, { data: {
                    nickname:  hash.nickname,
                    username: hash.username,
                    nicknames: hash.nicknames,
                    feed: hash.feed, 
                    posts: hash.posts,
                    announcements: hash.announcements, 
                    sphereMap: hash.sphereMap,
                    sphereIDs: hash.sphereIDs,
                    currentSphere: hash.currentSphere,
                    totalUpdates: hash.totalUpdates,
                    contacts: hash.contacts,
                    requests: hash.requests,
                    newRequests: hash.newRequests
                }
           });       		
	 }
	 
}


exports.createSessionData = function(){
	var sessionData = {};

	sessionData.username = "",
	sessionData.nickname = "",
    sessionData.userID = "",
	sessionData.nicknames = [],
	sessionData.currentSphere = "",
	sessionData.sphereData = {},
    sessionData.sphereMap = {},
    sessionData.sphereIDs = [], 
    sessionData.totalUpdates = 0,
    sessionData.posts = {},
    sessionData.feed = [],
    sessionData.contacts = {},
    sessionData.requests = {},
    sessionData.newRequests = 0,
    sessionData.announcements = {};

    return sessionData;
}





exports.storeData = function(req, sessionData){
	console.log("Storing Session Data..");
    // store session data 
	req.session.sphereMap = sessionData.sphereMap;
	req.session.sphereIDs = sessionData.sphereIDs;
	req.session.username = sessionData.username;
	req.session.nickname = sessionData.nickname;
	req.session.nicknames = sessionData.nicknames;
    req.session.feed = sessionData.feed;
	req.session.posts = sessionData.posts;
    req.session.announcements = sessionData.announcements;
	req.session.currentSphere = sessionData.currentSphere;
	req.session.totalUpdates = sessionData.totalUpdates;
	req.session.contacts = sessionData.contacts; 
    req.session.requests = sessionData.requests;
    req.session.newRequests = sessionData.newRequests
    req.session.userID = sessionData.userID;
    req.session.save(function(err, session){
        if(!err && session){
            console.log(JSON.stringify(session));
        }
    });
}

exports.sendCookie = function(res, email){
     console.log("Passing persistent cookie..");
     res.cookie('email', email, { maxAge: 900000, httpOnly: true });
}