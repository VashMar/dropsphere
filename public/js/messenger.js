function scrollBottom(){
    var chatBox = document.getElementById("feed");
    chatBox.scrollTop = chatBox.scrollHeight;
}

moment().format();

moment.lang('en', {
    calendar : {
        lastDay : '[Yesterday at] LT',
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        lastWeek : '[last] dddd [at] LT',
        nextWeek : 'dddd [at] LT',
        sameElse : 'MMM Do [at] LT'
    }
});


function Chat(username){

    var socket = io('/', {forceNew: true}); //io.connect(window.location.hostname);  
    var username = username; 
    var currentPost = null;
    var filteredPosts = [];
    var searching = false;
    var filtering = false;

    var postInput = null;
    var previewURL = null;


    var sharedPost = null,
        sharedPostID;

    var seenIcon = "<a href='#' class='chatIcon' title='Discuss Post'></a>";
    var unseenIcon = "<a href='#' class='unseenChat' title='Discuss Post'></a>";


    var postImage = "",
        postTitle = "",
        postURL = "",
        postThumb = "";
         
    socket.on('connect', function(){
        console.log('socket io connected');
        if(!logged){
            socket.emit('getUpdates', currentSphere);
        }
    });

     /* chat object functions */
    this.Connect = function(user){ 
        socket.connect();    
    }

    this.Disconnect = function(){
        socket.emit('leaveRooms', sphereIDs );
        socket.disconnect();
    }
   
        
    this.Socket = function(){
        return socket; 
    }


    this.Preview = function(data){
        previewURL = buildPostContent(true, data);
        postThumb = data['thumbnail'];
        postTitle = data['title'];
        postURL = data['url'];
        postImage = data['image'];
        var x = $("#previewLink").html(previewURL);

        $("#previewLink").html(previewURL);
        $("#previewContainer").show();

    }


    this.Crawl = function(link){
        $("#previewLink").html("<img style='float:none;' src='/img/loading.gif' />");
        $("#previewContainer").show();
        socket.emit("crawl", link);
    }
    
    this.setShared = function(postID){
        sharedPost = posts[postID];
        sharedPostID = postID;
    }

    this.Send = function(msg){
        var tags = tagStrip(msg);
        socket.emit("sendMessage", {postID: currentPost, sphere: currentSphere, msg: msg, sender: nickname, tags: tags});  
    }


    this.SphereChat = function(){
        currentPost = "sphereChat";
        var header = sphereMap[currentSphere].name + "'s chat";
        chatView(header);
        requestMessages();
        seenChat("sphereChat");
        sphereMap[currentSphere].seenChat = true;
    }


    this.SelectPost = function(selected){
        var postContent = selected.html();

        postContent = postContent.substring(0, postContent.indexOf('<div class="postButtons">'));
        
        // track what the current post is by id 
        currentPost = selected.attr('data');

        console.log(postContent);
        // store the posting text box view which disappears 
        chatView(postContent);
        requestMessages();
        // the chat for this post will be seen by this user 
        seenChat(currentPost);
    }

    this.FeedReturn = function(){
        $(".controls").hide();
        $(".postBox").html(postInput);
        $("#postViewer").remove();
       // $(".tagList").parent().remove();
        $(".tagList").remove();
        $(".slimScrollDiv").css('height', feedHeight);
        $("#feed").css('height', "94%");
        $("#search").show();
        currentPost = null;
        clearUpdates();
        viewFeed();
    }

    this.Search = function(keyword){
        if(keyword.length > 0){
            searching = true;
            var results = 0;
            if(filteredPosts.length > 0){
                console.log("Searching filtered posts..");
                for(var i = 0; i < filteredPosts.length; i++){
                    var postID = filteredPosts[i];
                    var post = posts[postID];
                    var title = post['content']['title'];   
                    var sender = post['sender'];
                    var tags = post['tags'].toString();
                    var element = $(".post[data=" + postID + "]");
                    title = title.toLowerCase();
                    sender = sender.toLowerCase();
                    tags = tags.toLowerCase();
                    console.log("title, sender, tags: " + title +  "," + sender + "," + tags);
                    if(title.indexOf(keyword) < 0 && sender.indexOf(keyword) < 0 && tags.indexOf(keyword) < 0){
                       console.log("hiding element..");
                       element.hide();
                    }else{
                       $(".noResults").remove();
                       element.show();
                       results++;
                    }
                }
            }else if(feed.length > 0){
                for(var i = feed.length -1 ; i > -1 ; i--){
                    var postID = feed[i];
                    var post = posts[postID];
                    var title = post['content']['title'];   
                    var sender = post['sender'];
                    var tags = post['tags'].toString();
                    var element = $(".post[data=" + postID + "]");
                    title = title.toLowerCase();
                    sender = sender.toLowerCase();
                    tags = tags.toLowerCase();
                    if(title.indexOf(keyword) < 0 && sender.indexOf(keyword) < 0 && tags.indexOf(keyword) < 0){
                       element.hide();
                    }else{
                       $(".noResults").remove();
                       element.show();
                       results++;
                    }
                }
            }

            if(results < 1 && $(".noResults").length < 1){
              $("<p class='noResults'> No results found.. </p>").insertAfter("#sphereChat");
            }

      }else{
        searching = false;
        if(filteredPosts.length > 0){
            $(".post").show();
        }else{
            viewFeed();
        }
      }
    }

    this.FilterType = function(type){
       emptyWithChat();
       filtering = true;
        if(feed.length > 0){
            for(var i = feed.length -1 ; i > -1 ; i--){
                var postID = feed[i];
                var post = posts[postID];
                var sender = post['sender'];
                var content = post['content'];
                var isOwner = post['isOwner'];
                var isLink = post['isLink'];
                var postTime = post['postTime'];
                var seen = post['seen'];
                var viewers = post['viewers'];
                var tags = post['tags'];
                var memberNum = nicknames.indexOf(sender); 
                time = moment(postTime).format("MMM Do, h:mm a");


                var passFilter = (type == "text" && isLink == false) || 
                                 (type == "image" && content['image'] != "") ||  
                                 (type == "link" && isLink == true && content['image'] == "" ) ||
                                 (type == "unread" && !seen);
                if(passFilter){
                    content = buildPostContent(isLink, content);
                    createPost(postID, content, memberNum, sender, time, seen, isOwner, viewers.length, tags);
                    filteredPosts.push(postID);
                    console.log("Filtered Posts: " + filteredPosts);
                }
            }
        }

        if(filteredPosts.length == 0){
            console.log("no posts found");
            $("<p class='noResults'> No results found.. </p>").insertAfter("#sphereChat");
        }
    }

    this.FilterRecent = function(){
        viewFeed();
    }

    this.SwitchSphere = function(sphereID){
        switchSphere(sphereID);
    }

 
    this.CreateSphere = function(sphereName){
        // create a new sphere and return the updated sphereMap with the sphere's data  
        socket.emit('createSphere', sphereName);
    }


    this.Post = function(post){
        console.log("Emitting Post..");
        var memberNum = nicknames.indexOf(nickname);
        var time = moment().format("MMM Do, h:mm a");
        if(previewURL){
            if(post != ""){
                var startTag = previewURL.indexOf('>', previewURL.indexOf('<span')) + 1;
                previewURL = previewURL.substring(0,startTag) + post + "</span></a>";
                postTitle = post;
            }
            createPost(null, previewURL, memberNum, nickname, time, true, true);
            var postData = {sphere: currentSphere,
                            post: previewURL,
                            url: postURL,
                            thumbnail: postThumb,
                            title: postTitle,
                            image: postImage,
                            sender: nickname};

            socket.emit("post", postData);
            previewURL = null;
        }else{
            createdPost = "<a href='#' class='textPost'>" + post + "</a>";
            createPost(null, createdPost, memberNum, nickname, time, true, true);
            socket.emit("post", {sphere: currentSphere, title: post, sender: nickname});
        }
    }

    this.ViewedPost = function(postID){
        socket.emit('viewedPost', {postID: postID, sphere: currentSphere});
    }

    this.EditPost = function(postID, newtext){
        socket.emit('editPost', {postID: postID, newtext: newtext, sphere: currentSphere});
        notify("Post Changes Made");
    }

    this.DeletePost = function(postID){
        socket.emit('deletePost',{postID: postID, sphere: sphereID});
        notify("Post Deleted");
    }

    this.OpenPersonal = function(userID){
        socket.emit('personalSphere', userID);
    }

    this.SavePost = function(postID){
        socket.emit('addToMain', postID);
        notify("Post Saved");
    }

    this.DeleteSphere = function(sphereID){
        // remove sphere from sphereMap
        delete sphereMap[sphereID]; 

        // check if the currentSphere is being deleted, if so, switch to mainsphere
        if(sphereID == currentSphere){
            this.SwitchSphere(sphereIDs[0]);
        }

        //remove the sphere from the dropdown 
        $("#sphereNames a[data='" + sphereID + "']").remove();

        // delete from backend
        socket.emit('deleteSphere', sphereID);

        notify("Sphere Deleted");
    }

    this.SetNickname = function(spheres, newNick){

        // change the user's nickname on each selected sphere on the sphereMap
        spheres.forEach(function(sphere){
            // if the current sphere was also selected update the user's currently seen nickname 
            if(sphere == currentSphere){
                nickname = newNick;
            }
            sphereMap[sphere].nickname = newNick;
        });

        socket.emit("setNickname", {spheres: spheres, nickname: newNick});
    }

    this.SendInvite = function(invited){
        notify("Invite Sent");
        socket.emit('sphereInvite', {sphere:currentSphere, invited:invited});
    }

    this.AddContact = function(contact){
        console.log("Adding Contact: " + contact);
        socket.emit('addContact', contact);
    }

    this.RequestsSeen = function(){
        socket.emit('requestsSeen');
    }

    this.AcceptRequest = function(requester){
       socket.emit('acceptRequest', requester); 
    }

    this.IgnoreRequest = function(requester){
        socket.emit('ignoreRequest', requester);
    }

    this.AcceptInvite = function(sphere){
        socket.emit('acceptInvite', sphere);
    }

    this.IgnoreInvite = function(sphere){
        socket.emit('ignoreInvite', sphere);
    }

    this.addTag = function(tag, postID){
        if(tag[0] != "#"){ tag = "#" + tag;}
        if(!postID){postID = currentPost;}

        socket.emit('addTag', {tag: tag, postID: postID, sphere: currentSphere});
    }

    this.fillTags = function(postID){
        fillTags(postID);
    }

 /* Socket Bindings */

    socket.on('userLoaded', function(){
         console.log("user loaded");
    }); 

    socket.on('users', function(data){
        if(currentSphere == data.sphereID){
            var nicknames = data.nicknames; // store array of all user nicknames in sphere 
            var members = nicknames.length;

            $("#users").empty();

            for(var i = 0; i < members; i++){
                $("#users").append("<p>" + nicknames[i] + "</p>");
            }


            if(sphereMap[currentSphere].type == "Group"){
                $("#users").prepend("<a id='share_small' data-toggle='modal' data-target='#shareModal'></a>");
            }

            cacheNicknames(nicknames);

        }
    });


    socket.on('message', function(data){
           
        if(data.msg){
            // if the message is being sent to the currently viewed chat, append it
            if(currentSphere == data.sphere && currentPost == data.postID){    
                 // update message seen here 
                 var memberNum = nicknames.indexOf(data.sender);         
                 for(var i = 0; i < data.tags.length; i++){
                    var tag = data.tags[i];
                    data.msg = data.msg.replace(data.tags[i], "<a class='postTag'>" + data.tags[i] + "</a>");
                 }
                 $("#feed").append("<p class='message'><span class='chatSender user" + memberNum + "'>" + data.sender + ": </span> " + data.msg  + "</p>");
                 scrollBottom();
            }else if(currentSphere == data.sphere && data.postID == "sphereChat"){
              var element = $("#sphereChatIcon");
              element.removeAttr('id');
              element.attr('id', 'unseenSphereChat');  
              socket.emit('cacheSphereChat', {sphere: data.sphere, seen: false});
            }else if(currentSphere == data.sphere){
              var newMsgIcon = $(".post[data='" + data.postID + "']").find(".chatIcon");
              newMsgIcon.addClass('unseenChat');
              newMsgIcon.removeClass('chatIcon');      
            }else{
                if(data.postID == "sphereChat"){
                    socket.emit('cacheSphereChat', {sphere: data.sphere, seen: false});
                    sphereMap[data.sphere].seenChat = false;
                    console.log(sphereMap[data.sphere]);
                }

               // update notification for chat messages   
               addUpdate(data.sphere);  

            }
            
        }           
    });

    socket.on('post', function(data){
        console.log("Receiving Post..");
        // if the message is being sent to the current sphere being looked at, add it to the chat 
        if(currentSphere == data.sphere && currentPost == null && !searching && !filtering){    
             var memberNum = data.memberNum || nicknames.indexOf(data.sender);  
             var time = data.time || moment().calendar();       
             createPost(data.postID, data.post, memberNum, data.sender, time, true, data.isOwner);
             socket.emit("seen", {sphere: data.sphere});
        }else if(sphereIDs.indexOf(data.sphere) >= 0 && sphereMap[data.sphere]){
              addUpdate(data.sphere);  
        }else{
            // this mean that there's a sphere connected to the socket but not on the client's sphereMap yet, so let's cache it
            socket.emit("cacheSphere", data.sphere);
        }
    });

    socket.on('announcement', function(data){
        $("#feed").append("<p class='announcement'>" + data.msg + "</p>"); // announces the new entrant to others in the sphere
    });


    socket.on('clearChat', function(){
        emptyWithChat();
    });

    socket.on('chatError', function(data){
        alertIssue(data);
    });


    socket.on('notifySound', function(){
        notifySound();
    });


    socket.on('removePost', function(data){
        $(".post[data=" + data.postID + "]").fadeOut(550, "linear");
    });

    socket.on('cachePost', function(data){
        if(currentSphere == data.sphereID){
            feed = data.feed;
            posts = data.posts;
        }
    });

    socket.on('postEdited', function(data){
        console.log("Editing Post..");
        var postItem = ".post[data=" + data.postID + "]";
        var postTitle =  $(postItem + "span.title").length > 0 ? $(postItem + "span.title") : $(postItem + "a.textPost");
        console.log(postTitle);
        postTitle.html(data.title);
    });

    socket.on('updates', function(data){
        var updateList = data.updateList;
        var spheres = Object.keys(updateList);
        totalUpdates = data.totalUpdates;

        for(var i = 0; i < spheres.length; i++){
            var sphere = spheres[i];
            if(sphereMap[sphere]){
                sphereMap[sphere].updates = updateList[sphere];
                var updates = sphereMap[sphere].updates;
                if(updates > 0){
                    $("#updates-" + i ).html(updates);
                    $("#updates-" + i).css('display', 'inline');
                }
            } 
        }

        
        requestFeed();

    });

    socket.on('updateView', function(data){
        console.log("updating view..");
        feed = data.feed;
        posts = data.posts;
        socket.emit('requestUsers', {sphereID : currentSphere});
        viewFeed();
    });

    socket.on('updateCurrent', function(sphereID){
        currentSphere = sphereID;
        sphereName = sphereMap[currentSphere].name;
        
        $("span#currentSphere").html(sphereName);

        // set the user's name to their name in the new sphere 
        nickname = sphereMap[currentSphere].nickname;
        sphereName = sphereMap[currentSphere].name;
        sphereIndex = sphereIDs.indexOf(currentSphere);   
        sphereLink = sphereMap[currentSphere].link;

    });

    socket.on('preview', function(data){
        $("#previewLink").html(data.wrappedLink);
        previewURL = data.wrappedLink;
        postURL = data.url;
        postThumb = data.thumbnail;
        postTitle = data.title;

        postImage = data.image; 
    });

    socket.on('getPostID', function(data){
        $("#feed .post").first().attr("data", data.postID);
    });

    socket.on('newSphere', function(data){
        console.log("Joining new sphere..");
       
        // track new sphere data 
        sphereMap = data.sphereMap;
        sphereIDs = data.sphereIDs;
        currentSphere = data.currentSphere;
        sphereIndex = sphereIDs.indexOf(currentSphere);
        sphereName = sphereMap[currentSphere].name;
        sphereLink = sphereMap[currentSphere].link;
        nickname = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)
        var type = sphereMap[currentSphere].type;
        var glyphicon = (type == "Personal") ? 'glyphicon glyphicon-user' : 'glyphicon glyphicon-globe';

        notify("You have joined " + sphereName);

        // the current sphere is the newly created one 
        $("span#currentSphere").html(sphereName).append("<span class='caret'></span>");   

        $("#sphereNames").append("<a class='sphere' data='"+ currentSphere +"' href='#' tabindex='-1' role='menuitem'><span id='okcircle-" +
          sphereIndex + "' class='" + glyphicon + "'></span><span class='sphereUpdates' style='display:none;' id='updates-"+ sphereIndex + "'></span>" + 
          "<span class='sphereName'>" + sphereName + "</span>");

        $("#inviteLink").val(sphereLink); 
        appendCurrentIcon(type);

        if(sphereMap[currentSphere].isOwner){
            if($("#deleteSphere p").length > 0){
                $("#deleteSphere p").remove();
            }
            var icon =  "<span class="+ glyphicon +" style='padding-right:5px;'></span>";
            $("#deletableSpheres").append("<li data='" + currentSphere + "'>"+ icon +"<a href='#'>" + sphereName + "</a></li> ");
            $("#shareModal").modal();
        }

        if(sharedPost){
            share();
        }else{
            $("<p class='announcement'> Don't you just love that new sphere smell? </p>").insertAfter("#sphereChat");
        }
    });

    socket.on('updateViewers', function(data){
        var viewers = data.viewers;
        var post =  $(".post[data=" + data.postID + "]");

        post.find(".postButtons ul li a").first().append("<span class='viewedNum'>" + viewers.length + "</span>");

    });


    socket.on('addContact', function(data){
        console.log("Add Contact Hit");
        if(contacts.indexOf(data.id) < 0){
            console.log("Adding new contact: " + data.name + "," + data.id);
            socket.emit('addContact', data.name);
        }
    });

    socket.on('contactAdded', function(data){
        // clear the input box
        $("#contactAdding input").val('');
        // notify that the contact was added 
        $("#contactAdding input").css("border-color", "green");
        $("#contactNotifications").html("<p id='found'>" + data.username +" has been added to your contacts!</p>");
        $("#contactNotifications").show();
        // add the name to the contacts list 
        addNewContact(data.username, data.userID);
    });

    socket.on('pendingRequest', function(data){

        if($("#pendingRequests li").length > 0){
            $("#requestLabel").show();
        }

        //update requests notifications and add the request to the requests list
        var glyphicon = "<span class='glyphicon glyphicon-user'></span>";
        var requester = "<span id='requesterName'>" + data.username + "</span>";
        var accept = "<a id='acceptRequest' href='#'>Accept</a>";
        var ignore = "<a id='ignoreRequest' href='#'>Ignore</a>";;
        $("#pendingRequests").append("<li data='" + data.userID + "'>" + glyphicon + requester + accept + ignore + "</li>");
        $("#newRequests").html("<p>" + data.newRequests + "</p>");
        $("#newRequests").show();
        // update session           
        socket.emit('newRequest');
        socket.emit('cacheRequest', {requestID: data.userID, sender: requester });
    });

    socket.on('pendingInvite', function(data){
        if($("#pendingInvites li").length > 0){
            $("#inviteLabel").show();
        }

        //update requests notifications and add the request to the requests list
        var glyphicon = "<span class='glyphicon glyphicon-globe'></span>";
        var sphereName  = "<span id='invitedSphere'>" + data.sphereName + "</span>";
        var sender = "<span id='inviteSender'>(from: " + data.sender + ")</span>";
        var accept = "<a id='acceptInvite' href='#'>Accept</a>";
        var ignore = "<a id='ignoreInvite' href='#'>Ignore</a>";;
        $("#pendingInvites").append("<li data='" + data.sphere + "'>" + glyphicon + sphereName + sender + accept + ignore + "</li>");
        $("#newRequests").html("<p>" + data.newRequests + "</p>");
        $("#newRequests").show();
        // update session         
        socket.emit('newRequest');
        socket.emit('cacheInvite', {sphereID: data.sphere, sender: data.sender, sphereName: data.sphereName });
    });


    socket.on('contactNotFound', function(data){
        $("#contactAdding input").css("border-color", "red");
        $("#contactNotifications").html("<p id='notFound'>Contact Not Found</p>");
        $("#contactNotifications").show();
    });

    socket.on('contactExists', function(){
        $("#contactAdding input").css("border-color", "green");
        $("#contactNotifications").html("<p id='found'>Contact Already Exists</p>");
        $("#contactNotifications").show();
    });


    socket.on('emailInviteSent', function(data){
        $("#contactAdding input").css("border-color", "green");
        $("#contactNotifications").html("<p id='found'>An invite has been sent to this email! You will be notified if they join</p>");
        $("#contactNotifications").show();
    });


    socket.on('joinSphere', function(sphere){
        socket.emit('connectSocket', sphere);
    });

    socket.on('addSphereAndNotify', function(data){
        sphereIDs.push(data.sphere);
        sphereMap = data.map;
        sphereName = sphereMap[data.sphere].name;
        sphereIndex = sphereIDs.length - 1;
        updates = sphereMap[data.sphere].updates;
        var type = sphereMap[data.sphere].type;
        var glyphicon = (type == "Personal") ? 'glyphicon glyphicon-user' : 'glyphicon glyphicon-globe';
     
        $("#sphereNames").append("<a class='sphere' data='" + data.sphere +"' href='#' tabindex='-1' role='menuitem'><span id='okcircle-" +
          sphereIndex + "' class='"+ glyphicon + "'></span><span class='sphereUpdates' style='display:inline;' id='updates-"+ sphereIndex + "'>"+ updates + "</span>" + 
          "<span class='sphereName'>" + sphereName + "</span>");

        appendCurrentIcon(type);
        totalUpdates++;   // because this sphere's updates have been incremented, so has the total
        $("#notifications").html(totalUpdates);
    });

    socket.on('nicknameSuccess', function(data){
        // find the selected spheres and change their user nicknames 
        $("#nickAddingSpheres li").each(function(){
                if(data.spheres.indexOf($(this).attr('data')) > -1){
                    $(this).children('span').html("(" + data.nickname + ")");
                }
        });
    });


    socket.on('nonexistingSphere', function(){

        //remove the sphere from the dropdown 
        $("#sphereNames a[data='" + currentSphere + "']").remove();
        sphereIDs.splice(sphereIDs.indexOf(currentSphere), 1);
        // remove sphere from sphereMap
        delete sphereMap[currentSphere]; 
        switchSphere(sphereIDs[0]);    
        notify("Sphere doesn't exist");
        socket.emit('sphereDeleteUpdate', {map: sphereMap, ids: sphereIDs});

    });

    socket.on('renderConvo', function(messages){
        console.log("rendering convo..");
        var conversations = Object.keys(messages);

        if(conversations.length > 0 ){
            for(var i =0; i < conversations.length; i++){
            
                var convoTime = conversations[i];
                var convo = messages[convoTime];

                $("#feed").append("<h6>" + moment(convoTime).calendar() + "</h6>");

                for(var m = 0; m < convo.length; m++){
                    var msg = convo[m];

                    var sender = msg[0],
                        text = msg[1], 
                        hasTags = msg[2],
                        memberNum = nicknames.indexOf(sender);

                    if(hasTags){text = tagify(text)};    

                    $("#feed").append("<p class='message'><span class='chatSender user" + memberNum + "'>" + sender + ": </span> " + text  + "</p>");
                }
            }       
        }else if(sphereMap[currentSphere].type == "Main"){
            $("#feed").append("<p class='announcement'>Tag and make notes for this post</p>");
        }

        scrollBottom();
    });

    socket.on('updateTags', function(data){
        console.log("updating tags..");
        var post = posts[data.postID];
        var tags = data.tags; 
        post.tags = post.tags.concat(tags);
        var tagList = "<ul class='tagList'>";

        for(var i = 0; i < tags.length; i++){
            var tag = "<li>" + tags[i] + "</li>";
            if($(".tagList").length > 0){
                console.log("adding to taglist..");
                $(".tagList").append(tag);
            }else{
                tagList += tag;
                if(i == tags.length -1){
                    tagList += "</ul>";
                    console.log(tagList)
                    $("#tagList .modal-body").html(tagList);
                }
            }        
        }
    });

    /* Extra Functions */


    var requestFeed = function(){
        clearUpdates(); // get rid of notifications for the sphere being accessed 
        socket.emit('requestFeed', {sphereID: currentSphere, sphereIndex: sphereIndex});
    };



    var viewFeed = function(){
        emptyWithChat();
        if(feed.length > 0){
            for(var i = feed.length -1 ; i > -1 ; i--){
                var postID = feed[i];
                var post = posts[postID];
                var sender = post['sender'];
                var content = post['content'];
                var isOwner = post['isOwner'];
                var isLink = post['isLink'];
                var postTime = post['postTime'];
                var seen = post['seen'];
                var tags = post['tags']
                var viewers = post['viewers'];
                var memberNum = nicknames.indexOf(sender); 

                time = moment(postTime).format("MMM Do, h:mm a");
                content = buildPostContent(isLink, content);
                createPost(postID, content, memberNum, sender, time, seen, isOwner, viewers.length, tags);
            }
        }else{
            var noPosts = "<p class='noResults'> This is a sphere of nothingness. A single drop could change that.. </p>"
            $("#sphereChat").length > 0 ?  $(noPosts).insertAfter("#sphereChat") : $("#feed").append(noPosts);
        }

        if(sharedPost){
            share();
        }
    };



    function share(){

        var postID = sharedPost;
        var sphere = currentSphere;


        var post = sharedPost,
            isLink = post['isLink'],
            time = moment().format("MMM Do, h:mm a"),
            memberNum = nicknames.indexOf(nickname), 
            content =  post['content'];


        var thumbnail = content['thumbnail'],
            image = content['image'],
            title = content['title'],
            url = content['url'];

         content = buildPostContent(isLink, content);
         createPost(postID, content, memberNum, nickname, time, true, true, 0);

         socket.emit('sharePost', {postID: sharedPostID, sphere:sphere});

         // reset sharedPost 
         sharedPost = null;
    }

    function requestMessages(){
        clearUpdates(); // get rid of notifications for the sphere being accessed 
        socket.emit('requestMessages', {postID: currentPost, sphereID: currentSphere});
    };


    function switchSphere(sphereID){
        currentSphere = sphereID;          

        if(currentPost){
            $(".controls").hide();
            $(".postBox").html(postInput);
            currentPost = null;
        }

        $(".slimScrollDiv").css('height', feedHeight);
        $("#feed").css('height', "94%");
        $("#search").show();

        // set the user's name to their name in the new sphere 
        nickname = sphereMap[currentSphere].nickname;
        sphereName = sphereMap[currentSphere].name;
        sphereIndex = sphereIDs.indexOf(currentSphere);   
        sphereLink = sphereMap[currentSphere].link;
        
        var type = sphereMap[currentSphere].type;
        appendCurrentIcon(type);

        $("#inviteLink").val(sphereLink);
        $("#searchInput").val(""); 
        searching = false; 
        $("#postViewer").remove();

        requestFeed();
    }

    function addUpdate(sphere){
        // find the sphere the message is meant for and send the user an update notification
        var index = sphereIDs.indexOf(sphere);
        var sphereID = sphereIDs[index];
        
        sphereMap[sphereID].updates++;            // increment this spheres updates on client side 
        var updates = sphereMap[sphereID].updates;
        totalUpdates++;                                 // because this sphere's updates have been incremented, so has the total
        $("#notifications").html(totalUpdates);

        if(updates > 0){
            $("#updates-" + index).html(updates);
            $("#updates-" + index).css('display', 'inline');
        }
    }

    function chatView(postContent){

        postInput = $(".postBox").html();

        $("#search").hide();
        // swap posting text boxes with return to feed button
        $(".postBox").html("");
        $(".postBox").prepend("<a id='feedReturn' href='#' onclick='feedReturn();'> Return to Feed </a>");
        // show the messaging text box and buttton
        $(".controls").show();
        //empty the chat space
        $("#feed").empty();

        $("<div id='postViewer' class='post'>" + postContent + "</div>").insertAfter(".postBox");
        $(".post").children(".postButtons").css("display", "none");
   
        // resize the scroller for sphere chat view
        $(".slimScrollDiv").css('height', '100%');
        if($("#postViewer .dropdown").length > 0){
            $("#postViewer .dropdown").replaceWith(tagIcon);
        }else{
            $("#postViewer .sender").prepend(tagIcon);
           // $(tagIcon).insertAfter("#postViewer .sender");
        }

        feedResize();
        if(currentPost != "sphereChat"){fillTags(currentPost);}
    }

    function feedResize(){
        var ch = $("#content").height();
        var viewerHeight = $("#postViewer").height();
        var pbHeight = $(".postBox").height();
        var mbHeight = $("#messageBox").height();
        var feedResize = ch - (viewerHeight + pbHeight + mbHeight + 10);
        feedResize += 'px';

        $("#feed").css('height', feedResize);
    }


    function fillTags(postID){
       // append a tag list if the post already has tags
        var postTags = posts[postID].tags;
        var tagList = "";

        console.log(posts[postID].tags);
        if(postTags.length > 0){
            tagList = "<ul class='tagList'>";
            for(var i =0; i< postTags.length; i++){
                tagList += "<li>" + postTags[i] + "</li>";
                if(i == postTags.length -1){
                    tagList += "</ul>";
                    $("#tagList .modal-body").html(tagList);
                }
            }
        }else{
            $("#tagList .modal-body").html("<p class='announcement'> Uh oh, it appears nothing is tagged here. Guess it's not very memorable.. </h3>");
        }
    }


    function tagStrip(msg){ 
        var tags = [];
        var start = msg.indexOf("#"); 

        if(start >= 0){ 
            var foundTag = true;
            var tag = "#";
            var addTag = function(tag){
                if(tag.length > 1){
                    tags.push(tag);
                }
            };
            for(var i = start+1; i< msg.length; i++){
                var char = msg[i];
                if(foundTag){
                  if(char == " "){ foundTag = false; addTag(tag); tag = ""; }
                  else if(char == "#"){addTag(tag); tag ="#"; }
                  else{ tag += char;}      
                }else{
                 if(char == "#"){ foundTag= true; tag="#"; }
                }   

                if(foundTag && i == msg.length - 1){
                   addTag(tag);
                }
            }
            if(tags.length > 0){return tags;}  
        }

        return "";
        
    }

    function tagify(text){
        var tags = tagStrip(text);
        for(var i = 0; i < tags.length; i++){
                    var tag = tags[i];
                    text = text.replace(tags[i], "<a class='postTag'>" + tags[i] + "</a>");
        }
        return text;
    }

    function buildPostContent(isLink, content){
        var thumbnail = content['thumbnail'];
        var image = content['image'];
        var title = content['title'];
        var url = content['url'];
        var htmlString;

        if(isLink){
            if(image === ""){
                htmlString = "<a class='post_link' target='_blank' href='" + url + "'>";
                if(thumbnail === ""){
                    htmlString += "<span class='title' style='float:none; padding:5px;'>" + title + "</span>";
                }else{
                    htmlString += "<img src='" + thumbnail + "'/>";
                    htmlString += "<span class='title'>"+ title + "</span>";
                }
            }else{
                htmlString = "<a class='post_image' target='_blank' href='" + image + "'>";
                htmlString += "<img src='" + image + "'/>";
                htmlString += "<span class='title image'>"+ title + "</span>";
            }

          htmlString += "</a>"
        }else{
            htmlString = "<a href='#' class='textPost'>" + title + "</a>";
        }

        return htmlString;
    }

    function createPost(postID,content,memberNum,sender,time,seen,isOwner,viewedNum,tags){

        var chatIcon = (seen) ? seenIcon : unseenIcon;
            data = (postID) ? postID : '',
            options = "",
            viewed = "",
            viewedAndShare = "",
            sender = "<div class='postername'>" + sender + "</div>",
            savePost=   "<li>" + saveIcon + "</li>",
            postChat = "<li>" + chatIcon + "</li>",
            viewersIcon = "<li style='float:left;'>" + viewedIcon + viewed + "</li>",
            sharePost = "<li>" + shareIcon + " </li>",
            tagElement = "";


        if(isOwner){
            options = "<div class='dropdown'><a id='postSettings' data-toggle='dropdown' href='#'></a><ul id='postDropdown' role='menu' aria-labelledby='dLabel' class='dropdown-menu'><li role='presentation'><a id='editOption' role='menuitem' tabindex='-1' data-toggle='modal' data-target='#editPost' href='#'><span class='glyphicon glyphicon-pencil'></span><span class='postOption'>Edit post</span></a></li><li role='presentation'><a id='removeOption' role='menuitem' tabindex='-1' data-toggle='modal' data-target='#removePost' href='#'><span class='glyphicon glyphicon-trash'></span><span class='postOption'>Remove Post </span></a></li></ul></div>";
        }

        if(sphereMap[currentSphere].type == "Main"){
            savePost = "";
            postChat ="";
            viewersIcon = "";
            tagElement = "<li>" + tagIcon + "</li>";
            sender = "";
        }else if(viewedNum > 0){               
            viewed = "<span class='viewedNum'>" + viewedNum + "</span>";
            var viewsCounted = viewedIcon.replace("</a>", viewed + "</a>");
            viewersIcon = "<li style='float:left;'>" + viewsCounted + "</li>";
        }



        var postElement = $("<div class='post' data=" + data +  " data-tags="+ tags + ">" + 
            "<div class='sender user" + memberNum + "'>" + options + "<span>" + 
            sender + "<div class='time'>" + time + "</div></span></div>" + 
            "<div class='postContent'>" + content + "</div>" +
            "<div class='postButtons'><ul>" +
            viewersIcon +
            sharePost +
            tagElement + 
            savePost + 
            postChat + "</ul></div></div>");

        if($(".noResults").length > 0){
            $(".noResults").remove();
        }

        if($("#sphereChat").length > 0){
            postElement.insertAfter("#sphereChat");
        }else{
            $("#feed").prepend(postElement);
        }

    }


    function seenChat(postID){
        socket.emit("seenChat", {postID: postID, sphereID: currentSphere});
    }

    function cacheNicknames(nicknames){
        socket.emit("cacheNicknames", nicknames);
    }

    function clearUpdates(){

        // lets remove the update notifier next to the sphere dropdown 
        var i = sphereIDs.indexOf(currentSphere);

        $("#updates-" + i ).hide();

        // the user will see the updates of their current sphere, so no need to post them 
        totalUpdates -= sphereMap[currentSphere].updates;

        // if there are still remaining spheres with notifications show them 
        if(totalUpdates > 0){ $("#notifications").html(totalUpdates); }

        else{
            $("#notifications").html("");
        }

        // reset updates
        sphereMap[currentSphere].updates = 0; 

    }

    function emptyWithChat(){
        console.log(sphereMap[currentSphere]);
        filteredPosts = [];
        filtering = false;
        var seen = sphereMap[currentSphere].seenChat;
        var icon = (seen) ? 'sphereChatIcon' : 'unseenSphereChat';

        $('#feed').empty();
        if(sphereMap[currentSphere].type != "Main"){
            $('#feed').append("<div id='sphereChat'><a id=" + icon + " href='#'></a><a id='sphereChatTitle'>Open Sphere Chat</a></div>");
        }

    }

    function addNewContact(name, userID){
        var contactItem = "<li data='" + userID + "'><span class='glyphicon glyphicon-user'></span><a href='#'>" + name + "</a></li>";
        var invContact = "<li><a href='#' data='" + userID + "'><span class='glyphicon glyphicon-user'></span><span class='beingInvited'>" + name + "</span></a></li>";
        $("#contactNames").append(contactItem);
        $("#shareContacts").append(contactItem);
        $("#inviteContacts").append(invContact);
        $("#inviteSelectLabel").show();
    }


    function appendCurrentIcon(type){
        var caret = "<span class='caret'></span>";
        var globe = "<span class='glyphicon glyphicon-globe' style='padding-right:5px;''></span>" + sphereName + caret;
        var user = "<span class='glyphicon glyphicon-user' style='padding-right:5px;''></span>" + sphereName + caret;
        var star = "<span class='glyphicon glyphicon-star' style='padding-right:5px;''></span>" + sphereName + caret;

        if(type == "Personal"){
            $("span#currentSphere").html(user)
        }else if(type == "Main"){
            $("span#currentSphere").html(star);
        }else{
            $("span#currentSphere").html(globe);
        }
    }

    function notify(msg){
        $(".alert").html(msg);
        $(".alert").fadeIn(800);
        $('.alert').delay(400).fadeOut(1000);
    }


}
