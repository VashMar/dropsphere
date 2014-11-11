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


    var postInput = null;
    var previewURL = null;


    var sharedPost = null,
        sharedPostID;

    var seenIcon = "<a href='#' class='chatIcon'></a>";
    var unseenIcon = "<a href='#' class='unseenChat'></a>";


    var postImage = "",
        postTitle = "",
        postURL = "",
        postThumb = "";
         
    socket.on('connect', function(){
        console.log('socket io connected');
    });

     /* chat object functions */
    this.Connect = function(user){ 
        socket.connect();    
    }

    this.Disconnect = function(){
        socket.emit('leaveRooms', {spheres: sphereIDs} );
        socket.disconnect();
    }
   
        
    this.Socket = function(){
        return socket; 
    }


    this.Preview = function(link){
        $("#previewLink").html("<img style='float:none;' src='/img/loading.gif' />");
        $("#previewContainer").show();
        socket.emit("crawl", link);
    }


    
    this.setShared = function(postID){
        sharedPost = posts[postID];
        sharedPostID = postID;
    }

    this.Send = function(msg){
        socket.emit("sendMessage", {postID: currentPost, sphere: currentSphere, msg: msg, sender: nickname});  
    }


    this.SelectPost = function(selected){
        var postContent = selected.html();
        postContent = postContent.substring(0, postContent.indexOf('<div class="postButtons">'));
        // track what the current post is by id 
        currentPost = selected.attr('data');
        // store the posting text box view which disappears 
        postInput = $(".postBox").html();
        // swap posting text boxes with return to feed button
        $(".postBox").html("");
        $(".postBox").prepend("<a id='feedReturn' href='#' onclick='feedReturn();'> Return to Feed </a>");
        // show the messaging text box and buttton
        $(".controls").show();
        //empty the chat space
        $("#feed").empty();
        $("<div class='post'>" + postContent + "</div>").insertAfter(".postBox");
        $(".post").children(".postBUttons").css("display", "none");
        // resize the scroller for sphere chat view
        $(".slimScrollDiv").css('height', '75%');
        $("#feed").css('height', '90%');
        requestMessages();
        // the chat for this post will be seen by this user 
        seenChat(currentPost);
    }

    this.FeedReturn = function(){
        $(".controls").hide();
        $(".postBox").html(postInput);
        $(".post").remove();
        $(".slimScrollDiv").css('height', feedHeight);
        $("#feed").css('height', "94%");
        currentPost = null;
        viewFeed();
    }

    this.SwitchSphere = function(sphereID){
        
        currentSphere = sphereID;          

        if(currentPost){
            $(".controls").hide();
            $(".postBox").html(postInput);
            currentPost = null;
        }

        // set the user's name to their name in the new sphere 
        nickname = sphereMap[currentSphere].nickname;
        sphereName = sphereMap[currentSphere].name;
        sphereIndex = sphereIDs.indexOf(currentSphere);   
        sphereLink = sphereMap[currentSphere].link;
        
        var type = sphereMap[currentSphere].type;
        var caret = "<span class='caret'></span>";
        var globe = "<span class='glyphicon glyphicon-globe' style='padding-right:5px;''></span>" + sphereName + caret;
        var user = "<span class='glyphicon glyphicon-user' style='padding-right:5px;''></span>" + sphereName + caret;
        (type == "Personal") ? $("span#currentSphere").html(user) : $("span#currentSphere").html(globe);

        $("#inviteLink").val(sphereLink); 
            
        // socket.emit('requestUsers', {sphereID : sphereID});
        requestFeed();
    }

 

    this.CreateSphere = function(sphereName){
        // create a new sphere and return the updated sphereMap with the sphere's data  
        socket.emit('createSphere', sphereName);
    }


    this.Post = function(post){
        var memberNum = nicknames.indexOf(nickname);
        var time = moment().format("MMM Do, h:mm a");
        if(previewURL){
            if(post != ""){
                var startTag = previewURL.indexOf('>', previewURL.indexOf('<span')) + 1;
                previewURL = previewURL.substring(0,startTag) + post + "</span></a>";
                postTitle= post;
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
        socket.emit('editPost', {postID: postID, newtext: newtext});
        notify("Post Changes Made");
    }

    this.DeletePost = function(postID){
        socket.emit('deletePost', {postID: postID, sphere: sphereID });
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

 /* Socket Bindings */

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

    socket.on('sphereMap', function(data){
        sphereMap = data.sphereMap;
        sphereIDs = Object.keys(sphereMap);
        currentSphere = sphereIDs[data.index];
        nickname = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)
        totalUpdates = data.totalUpdates;

        $("span#currentSphere").html(currentSphere).append("<span class='caret'></span>");   
        $(".sphere").parent().remove();

        for(var i = 0; i < sphereIDs.length; i++){
            var sphereName = sphereIDs[i].name,
                updates = sphereIDs[i].updates;
            $("<li role='presentation'><a class='sphere' href='#' tabindex='-1' role='menuitem'><span class='glyphicon glyphicon-globe'></span> &nbsp;" + 
            sphereName + "</a><span id='updates-"+i+"' class='sphereUpdates'></span></li>")
            .insertBefore("#sphereDivider");

            // post the updates next to their appropriate sphere dropdown item, ignore the current sphere because thats already being viewed
            if(updates > 0 && sphereIDs[i] !== currentSphere){
                $("#updates-" + i ).html(sphereMap[sphereIDs[i]].updates);
            }

        }
           
        // if the user has a different name on the sphere specify it 
        if(sphereMap[currentSphere].nickname !== name){
            nickname = sphereMap[currentSphere].nickname;
         }

        // track sphere data 
        sphereName = sphereMap[currentSphere].name;
        sphereIndex = sphereIDs.indexOf(currentSphere);
        sphereLink = sphereMap[currentSphere].link;

        $("#inviteLink").val(sphereLink);


    });

    socket.on('message', function(data){
           
        if(data.msg){
            // if the message is being sent to the currently viewed chat, append it
            if(currentSphere == data.sphere && currentPost == data.postID) {    
                 var memberNum = nicknames.indexOf(data.sender);         
                 $("#feed").append("<p class='message'><span class='chatSender user" + memberNum + "'>" + data.sender + ": </span> " + data.msg  + "</p>");
                 scrollBottom();
            }else if(currentSphere == data.sphere){
              var newMsgIcon = $(".post[data='" + data.postID + "']").find(".chatIcon");
              newMsgIcon.addClass('unseenChat');
              newMsgIcon.removeClass('chatIcon');      
            }
        }           
    });

    socket.on('post', function(data){
      
        if(data.post){
            // if the message is being sent to the current sphere being looked at, add it to the chat 
            if(currentSphere == data.sphere && currentPost == null){    
                 var memberNum = data.memberNum || nicknames.indexOf(data.sender);  
                 var time = data.time || moment().calendar();       
                 createPost(data.postID, data.post, memberNum, data.sender, time, true, data.isOwner);
                 socket.emit("seen", {sphere: data.sphere});
            }else if(sphereIDs.indexOf(data.sphere) > 0 && sphereMap[data.sphere]){
                 // find the sphere the message is meant for and send the user an update notification
                for(var i = 0; i < sphereIDs.length; i++){
                    var sphereID = sphereIDs[i];
      
                        if(sphereID == data.sphere){
                            sphereMap[sphereID].updates++;            // increment this spheres updates on client side 
                            var updates = sphereMap[sphereID].updates;
                            totalUpdates++;                                 // because this sphere's updates have been incremented, so has the total
                            $("#notifications").html(totalUpdates); 

                            if($("#updates-" + i ).length){
                              $("#updates-" + i ).html(updates);
                            }else{
                              var updateIcon = "<span id='updates-" + i + "' class='sphereUpdates'>" + updates + "</span>";
                              $("#okcircle-" + i).replaceWith(updateIcon);
                            } 
                        }
                
                } // end loop  
            }else{
                // this mean that there's a sphere connected to the socket but not on the client's sphereMap yet, so let's cache it
                socket.emit("cacheSphere", data.sphere);
            }
        }        
    });

    socket.on('announcement', function(data){
        $("#feed").append("<p class='announcement'>" + data.msg + "</p>"); // announces the new entrant to others in the sphere
    });


    socket.on('clearChat', function(){
         $("#feed").empty();
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

    socket.on('updateAndView', function(data){

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

       
        // track new sphere data 
        sphereMap = data.sphereMap;
        sphereIDs = data.sphereIDs;
        currentSphere = data.currentSphere;
        sphereIndex = sphereIDs.indexOf(currentSphere);
        sphereName = sphereMap[currentSphere].name;
        sphereLink = sphereMap[currentSphere].link;
        nickname = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)

        notify("You have joined " + sphereName);

        // the current sphere is the newly created one 
        $("span#currentSphere").html(sphereName).append("<span class='caret'></span>");   

        $("#sphereNames").append("<a class='sphere' data='"+ currentSphere +"' href='#' tabindex='-1' role='menuitem'><span id='okcircle-" +
          sphereIndex + "' class='glyphicon glyphicon-globe'></span> &nbsp;" + 
          "<span class='sphereName'>" + sphereName + "</span>");

        $("#inviteLink").val(sphereLink); 

        if(sphereMap[currentSphere].isOwner){
            var globeIcon =  "<span class='glyphicon glyphicon-globe' style='padding-right:5px;'></span>";
            $("#deletableSpheres").append("<li data='" + currentSphere + "'>"+globeIcon+"<a href='#'>" + sphereName + "</a></li> ");
            $("#shareModal").modal();
        }

        if(sharedPost){
            share();
        }

    });

    socket.on('updateViewers', function(data){
        var viewers = data.viewers;
        var post =  $(".post[data=" + data.postID + "]");

        post.find(".postButtons ul li a").first().append("<span class='viewedNum'>" + viewers.length + "</span>");

    });


    socket.on('addContact', function(data){
        addNewContact(data.name, data.id);
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

        $("#sphereNames").append("<a class='sphere' data='" + data.sphere +  "'href='#' tabindex='-1' role='menuitem'> <span id='updates-" + 
        sphereIndex + "' class='sphereUpdates'>" + updates + "</span> &nbsp;" + 
          "<span class='sphereName'>" + sphereName + "</span>");

        totalUpdates++;  // because this sphere's updates have been incremented, so has the total
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


    /* Extra Functions */


    var requestFeed = function(){
        clearUpdates(); // get rid of notifications for the sphere being accessed 
        socket.emit('requestFeed',  {sphereID: currentSphere, sphereIndex: sphereIndex});
    };



    var viewFeed = function(){

        $("#feed").empty();
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
                var memberNum = nicknames.indexOf(sender); 

                time = moment(postTime).format("MMM Do, h:mm a");
                content = buildPostContent(isLink, content);
                createPost(postID, content, memberNum, sender, time, seen, isOwner, viewers.length);
            }
        }

        if(sharedPost){
            share();
        }
    };


    var share = function(){

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

    var requestMessages = function(){
        clearUpdates(); // get rid of notifications for the sphere being accessed 
        socket.emit('requestMessages', {postID: currentPost, sphereID: currentSphere}, function(messages){

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
                            memberNum = nicknames.indexOf(sender);

                        $("#feed").append("<p class='message'><span class='chatSender user" + memberNum + "'>" + sender + ": </span> " + text  + "</p>");
                    }
                }       
            } 
            scrollBottom();
        });
    };


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

    function createPost(postID,content,memberNum,sender,time,seen, isOwner, viewedNum){

        var chatIcon = (seen) ? seenIcon : unseenIcon;
            data = (postID) ? postID : '',
            options = "",
            viewed = "",
            viewedAndShare = "",
            sender = "<div class='postername'>" + sender + "</div>",
            savePost=   "<li>" + saveIcon + "</li>",
            postChat = "<li>" + chatIcon + "</li>",
            viewersIcon = "<li style='float:left;'>" + viewedIcon + viewed + "</li>",
            sharePost = "<li>" + shareIcon + " </li>";



        if(isOwner){
            options = "<div class='dropdown'><a id='postSettings' data-toggle='dropdown' href='#'></a><ul id='postDropdown' role='menu' aria-labelledby='dLabel' class='dropdown-menu'><li role='presentation'><a id='editOption' role='menuitem' tabindex='-1' data-toggle='modal' data-target='#editPost' href='#'><span class='glyphicon glyphicon-pencil'></span><span class='postOption'>Edit post</span></a></li><li role='presentation'><a id='removeOption' role='menuitem' tabindex='-1' data-toggle='modal' data-target='#removePost' href='#'><span class='glyphicon glyphicon-trash'></span><span class='postOption'>Remove Post </span></a></li></ul></div>";
        }

        if(sphereMap[currentSphere].type == "Main"){
            savePost = "";
            postChat ="";
            viewersIcon = "";
            sender = "";
        }else if(viewedNum > 0){               
            viewed = "<span class='viewedNum'>" + viewedNum + "</span>";
            var viewsCounted = viewedIcon.replace("</a>", viewed + "</a>");
            viewersIcon = "<li style='float:left;'>" + viewsCounted + "</li>";
        }



        $("#feed").prepend("<div class='post' data=" + data + ">" + 
            "<div class='sender user" + memberNum + "'>" + options + "<span>" + 
            sender + "<div class='time'>" + time + "</div></span></div>" + 
            "<div class='postContent'>" + content + "</div>" +
            "<div class='postButtons'><ul>" +
            viewersIcon +
            sharePost +
            savePost + 
            postChat + "</ul></div></div>");

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
        var okIcon = "<span id='okcircle-"+ i + "' class='glyphicon glyphicon-globe'></span>";

        $("#updates-" + i ).replaceWith(okIcon);

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

    function addNewContact(name, userID){
        var contactItem = "<li data='" + userID + "'><span class='glyphicon glyphicon-user'></span><a href='#'>" + name + "</a></li>";
        var invContact = "<li><a href='#' data='" + userID + "'><span class='glyphicon glyphicon-user'></span><span class='beingInvited'>" + name + "</span></a></li>";
        $("#contactNames").append(contactItem);
        $("#shareContacts").append(contactItem);
        $("#inviteContacts").append(invContact);
        $("#inviteSelectLabel").show();
    }

    function notify(msg){
        $(".alert").html(msg);
        $(".alert").fadeIn(800);
        $('.alert').delay(400).fadeOut(1000);
    }


}
