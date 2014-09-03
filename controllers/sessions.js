

exports.render = function(res, layout, hash){
	console.log("Session rendering...");
	if(hash){
		res.render(layout, { data: {
                    nickname:  hash.nickname,
                    username: hash.username,
                    nicknames: hash.nicknames,
                    feed: hash.feed, 
                    posts: hash.posts,
                    announcements: hash.announcements, 
                    sphereMap: hash.sphereMap,
                    sphereNames: hash.sphereNames,
                    currentSphere: hash.currentSphere,
                    totalUpdates: hash.totalUpdates,
                    contacts: hash.contacts
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
                    sphereNames: hash.sphereNames,
                    currentSphere: hash.currentSphere,
                    totalUpdates: hash.totalUpdates,
                    contacts: hash.contacts
                }
           });       		
	 }
	 
}



exports.createSessionData = function(){
	var sessionData = {};

	sessionData.username = "",
	sessionData.nickname = "",
	sessionData.nicknames = [],
	sessionData.currentSphere = "",
	sessionData.sphereData = {},
    sessionData.sphereMap = {},
    sessionData.sphereNames = [], 
    sessionData.totalUpdates = 0,
    sessionData.posts = {},
    sessionData.feed = [],
    sessionData.contacts = {},
    sessionData.announcements = {};

    return sessionData;
}





exports.storeData = function(req, sessionData){
	console.log("Storing Session Data..");
    // store session data 
	req.session.sphereMap = sessionData.sphereMap;
	req.session.sphereNames = sessionData.sphereNames;
	req.session.username = sessionData.username;
	req.session.nickname = sessionData.nickname;
	req.session.nicknames = sessionData.nicknames;
    req.session.feed = sessionData.feed;
	req.session.posts = sessionData.posts;
    req.session.announcements = sessionData.announcements;
	req.session.currentSphere = sessionData.currentSphere;
	req.session.totalUpdates = sessionData.totalUpdates;
	req.session.contacts = sessionData.contacts; 
	req.session.newMember = sessionData.true;
}