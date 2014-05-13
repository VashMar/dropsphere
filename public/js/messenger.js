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

socket = null;

function Chat(){
        
        var currentPost = null;
        var postInput = null;
        var previewURL = null;
        var feedHeight = $("#feed").height();
        var seenIcon = "<a href='#'><img class='chatIcon' src='/img/chat_icon.png' /></a>";
        var unseenIcon = "<a href='#'><img class='chatIcon' src='favicon.png' /></a>";

        this.Connect = function(user){ 

            socket =  io.connect(window.location.hostname);  
            username = user;
            

            socket.on('users', function(users){

                nicknames = users; // store array of all user nicknames in sphere 
                members = users.length;
                $("#users").empty();

                for(var i = 0; i < users.length; i++){
                    $("#users").append("<p>" + users[i] + "</p>");
                }
            });

            socket.on('sphereMap', function(data){
                sphereMap = data.sphereMap;
                sphereNames = Object.keys(sphereMap);
                currentSphere = sphereNames[data.index];
                nickname = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)
                totalUpdates = data.totalUpdates;

                $("span#currentSphere").html(currentSphere).append("<span class='caret'></span>");   
                $(".sphere").parent().remove();

                for(var i = 0; i < sphereNames.length; i++){

                    $("<li role='presentation'><a class='sphere' href='#' tabindex='-1' role='menuitem'><span class='glyphicon glyphicon-ok-circle'></span> &nbsp;" + 
                    sphereNames[i] + "</a><span id='updates-"+i+"' class='sphereUpdates'></span></li>")
                    .insertBefore("#sphereDivider");

                    // post the updates next to their appropriate sphere dropdown item, ignore the current sphere because thats already being viewed
                    if(sphereMap[sphereNames[i]].updates > 0 && sphereNames[i] !== currentSphere){
                        $("#updates-" + i ).html(sphereMap[sphereNames[i]].updates);
                    }

                }
                   
                // if the user has a different name on the sphere specify it 
                if(sphereMap[currentSphere].nickname !== name){
                    nickname = sphereMap[currentSphere].nickname;
                 }

                // track sphere data 
                sphereID = sphereMap[currentSphere].id;
                sphereIndex = sphereNames.indexOf(currentSphere);
                sphereLink = sphereMap[currentSphere].link;

                $("#inviteLink").val(sphereLink);

                if(data.justmade === undefined){
                    requestMessages();
                }
            });

            socket.on('message', function(data){
                   
                if(data.msg){
                    // if the message is being sent to the currently viewed chat, append it
                    if(sphereMap[currentSphere].id == data.sphere && currentPost == data.postID) {    
                         var memberNum = nicknames.indexOf(data.sender);         
                         $("#feed").append("<p class='message'><span class='user" + memberNum + "'>" + data.sender + ": </span> " + data.msg  + "</p>");
                         scrollBottom();
                    }else if(sphereMap[currentSphere].id == data.sphere){
                        $(".post[data='" + data.postID + "']").find(".chatIcon").attr('src', 'favicon.png');
                    }

                    /*else {
                         // find the sphere the message is meant for and send the user an update notification
                        for(var i = 0; i < sphereNames.length; i++){
                            if(sphereMap[sphereNames[i]].id == data.sphere){
                                sphereMap[sphereNames[i]].updates++;            // increment this spheres updates on client side 
                                var updates = sphereMap[sphereNames[i]].updates;
                                totalUpdates++;                                 // because this sphere's updates have been incremented, so has the total
                                $("#notifications").html(totalUpdates); 

                                if($("#updates-" + i ).length){
                                  $("#updates-" + i ).html(updates);
                                } else {
                                  var updateIcon = "<span id='updates-" + i + "' class='sphereUpdates'>" + updates + "</span>";
                                  $("#okcircle-" + i).replaceWith(updateIcon);
                                } 
                            }
                             
                        } 

                    } */
                }           
            });

            socket.on('post', function(data){
                if(data.post){
                    // if the message is being sent to the current sphere being looked at, add it to the chat 
                    if(sphereMap[currentSphere].id == data.sphere && currentPost == null) {    
                         var memberNum = data.memberNum || nicknames.indexOf(data.sender);  
                         var time = data.time || moment().calendar();       
                         createPost(data.postID, data.post, memberNum, data.sender, time, true);
                         socket.emit("seen", {sphere: data.sphere});
                    }
                    if(sphereMap[currentSphere].id == data.sphere){
                        var postData = [data.sender, data.post, false, data.isLink, data.postID, false];
                        socket.emit("updateSession", {postData: postData, time: data.timeFormatted});
                    }else {
                         // find the sphere the message is meant for and send the user an update notification
                        for(var i = 0; i < sphereNames.length; i++){
                            if(sphereMap[sphereNames[i]].id == data.sphere){
                                sphereMap[sphereNames[i]].updates++;            // increment this spheres updates on client side 
                                var updates = sphereMap[sphereNames[i]].updates;
                                totalUpdates++;                                 // because this sphere's updates have been incremented, so has the total
                                $("#notifications").html(totalUpdates); 

                                if($("#updates-" + i ).length){
                                  $("#updates-" + i ).html(updates);
                                } else {
                                  var updateIcon = "<span id='updates-" + i + "' class='sphereUpdates'>" + updates + "</span>";
                                  $("#okcircle-" + i).replaceWith(updateIcon);
                                } 
                            }
                             
                        } 
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


            socket.on('cachePost', function(data){
                feed = data.feed;
                posts = data.posts;
            });

        };

        this.Disconnect = function(){
            var sphereIDs = [];
            for(var i = 0; i< sphereNames.length; i++){
                sphereIDs.push(sphereMap[sphereNames[i]].id);
            }
            socket.emit('leaveRooms', {spheres: sphereIDs} );
            socket.disconnect();
        };
   
        
        this.Post = function Post(post){
            if(previewURL){
                if(post != ""){
                  var startTag =  previewURL.indexOf('>', previewURL.indexOf('<span')) + 1;
                  previewURL = previewURL.substring(0,startTag) + post + "</span></a>";
                }
               
                var memberNum = nicknames.indexOf(nickname);  
                var time = moment().format("MMM Do, h:mm a");      
                createPost(null, previewURL, memberNum, nickname, time, true);
                socket.emit("postURL", {sphere: sphereID, post: previewURL, sender: nickname, time: time, memberNum: memberNum}, function(postID){
                    $("#feed .post").first().attr("data", postID);
                });
                previewURL = null;
            }else{
                socket.emit("post", {sphere: sphereID, post: post, sender: nickname});
            }
        };

        this.Send = function Send(msg){
            socket.emit("send", {postID: currentPost, sphere: sphereID, msg: msg, sender: nickname});  
        };

        this.Preview = function Preview(link){
            $("#previewLink").html("<img style='float:none;' src='/img/loading.gif' />");
            $("#previewContainer").show();
            socket.emit("crawl", {url: link}, function(url){
                $("#previewLink").html(url);
                previewURL = url;
            }); 
        };

        this.SelectPost = function SelectPost(selected){
            selected.attr('id', 'selectedPost');
            currentPost = selected.attr('data');
            postInput = $(".postBox").html();
            var itemNum = selected.index();
            var itemHeight = selected.height();
            $(".postBox").html("");
            $(".postBox").prepend("<a id='feedReturn' href='#' onclick='feedReturn();'> Return to Feed </a>");
            $(".controls").show();
            $("#feed").empty();
            $(".slimScrollDiv").css('height', '98%');
            $("#feed").css('height', '96%');
            $("#feed").append(selected);
            requestMessages();
            seenConvo(itemNum);
        };

        this.FeedReturn = function FeedReturn(){
            $(".controls").hide();
            $(".postBox").html(postInput);
            $(".slimScrollDiv").css('height', '86%');
            $("#feed").css('height', '86%');
            currentPost = null;
            viewFeed();
        };

        this.SwitchSphere = function SwitchSphere(current){

            if(currentPost){
                $(".controls").hide();
                $(".postBox").html(postInput);
                currentPost = null;
            }

            // set the user's name to their name in the new sphere 
            nickname = sphereMap[current].nickname;
            sphereID = sphereMap[current].id;
            sphereIndex = sphereNames.indexOf(current);   
            sphereLink = sphereMap[current].link;
            currentSphere = current;
            socket.emit('requestUsers', {sphereID : sphereID});
            requestFeed();

        };

 

        this.CreateSphere = function CreateSphere(sphereName){
            // create a new sphere and return the updated sphereMap with the sphere's data  
            socket.emit('createSphere', {sphereName: sphereName}, function(newMap){

                // track sphere data 
                sphereMap = newMap;
                sphereNames = Object.keys(sphereMap);
                sphereIndex = sphereNames.length - 1;
                currentSphere = sphereNames[sphereIndex];
                sphereID = sphereMap[currentSphere].id;
                sphereLink = sphereMap[currentSphere].link;
                nickname = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)
    
                // the current sphere is the newly created one 
                $("span#currentSphere").html(currentSphere).append("<span class='caret'></span>");   

                $("#sphereNames").append("<a class='sphere' href='#' tabindex='-1' role='menuitem'><span id='okcircle-" +
                  sphereIndex + "' class='glyphicon glyphicon-ok-circle'></span> &nbsp;" + 
                  "<span class='sphereName'>" + currentSphere + "</span>");

                $("#inviteLink").val(sphereLink); 
            });
        };

        this.ChangeName = function ChangeName(newName, sphereWide){
             // update name on client side first   
           $("#users").children('p').each(function(){
                if($(this).text() == name){
                    $(this).text(newName);
                }
           });

           if(sphereWide){
             //update the user's name on all spheres of the sphereMap
             for(var i = 0; i< sphereNames.length; i++){
                // if the sphere nickname is the user's default username swap it with the new one 
                  if(sphereMap[sphereNames[i]].nickname == username){ 
                        sphereMap[sphereNames[i]].nickname = newName;
                  }
             }
            username = newName; // the username is now the newname  
           } else{
             // just update the name in this sphere  
             sphereMap[currentSphere].nickname = newName;   
           }
           // the user's sphere nickname changes in both scenarios  
           nickname = newName;

           socket.emit("changeName", {newName: name, sphereWide: sphereWide, sphereIndex: sphereIndex});
               
        };

        var requestFeed = function(){
            clearUpdates(); // get rid of notifications for the sphere being accessed 
            socket.emit('requestFeed',  {sphereID: sphereID, sphereIndex: sphereIndex}, function(reqPosts, reqFeed){  
                posts = reqPosts; 
                feed = reqFeed;
                viewFeed();
            });
        };

        var viewFeed = function(){

            $("#feed").empty();
            if(feed.length > 0){
                for(var i = feed.length -1 ; i > -1 ; i--){
                    var time = feed[i];
                    var post = posts[time];
                    var sender = post[0];
                    var content = post[1];
                    var isOwner = post[2];
                    var isLink = post[3];
                    var postID = post[4];
                    var seen = post[5];
                    var memberNum = nicknames.indexOf(sender); 
                    time = moment(time).format("MMM Do, h:mm a");

                    createPost(postID, content, memberNum, sender, time, seen);
                }
            }
        };


        var requestMessages = function(){
            clearUpdates(); // get rid of notifications for the sphere being accessed 
            socket.emit('requestMessages', {postID: currentPost}, function(messages){

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

                            $("#feed").append("<p class='message'><span class='user" + memberNum + "'>" + sender + ": </span> " + text  + "</p>");
                        }
                    }       
                } 
                scrollBottom();
            });
        };


        function createPost(postID,content,memberNum,sender,time, seen){

            var chatIcon = (seen) ? seenIcon : unseenIcon;
            var data = (postID) ? postID : '';

            $("#feed").prepend("<div class='post' data=" + data + ">" + 
                chatIcon +  content + 
                "<div class='sender user" + memberNum + "'><span>" + 
                sender + "<br />" + time + " </span></div>");
        }


        function seenConvo(postNum){
            var time = feed[postNum];
            posts[time][5] = true;
            socket.emit("seenConvo", {postID: posts[time][4], time:time});
        }
    

        function clearUpdates(){

            // lets remove the update notifier next to the sphere dropdown 
            var i = sphereNames.indexOf(currentSphere);
            var okIcon = "<span id='okcircle-"+ i + "' class='glyphicon glyphicon-ok-circle'></span>";

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


        function alertIssue(msg){

            $("#content").prepend("<div class='alert'>" +  msg +  "</div>");
            $('.alert').delay(5000).fadeOut(400);

            $('.alert').click(function(){
                $(this).fadeOut();
            });
        }

    } // end chat


