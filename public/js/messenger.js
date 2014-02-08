




function scrollBottom(){
    var chatBox = document.getElementById("content");
    chatBox.scrollTop = chatBox.scrollHeight;
}


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

   
        

        this.Connect = function(user){ 

            socket =  io.connect();  
            username = user;
            moment().format();
        

            socket.on('users', function(users){

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
                name = sphereMap[currentSphere].nickname; // user's name on sphere (username by default)
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
                    name = sphereMap[currentSphere].nickname;
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
                    if(sphereMap[currentSphere].id == data.sphere) {    
                        // if the message is being sent to the current sphere being looked at, add it to the chat 
                         $("#content").append("<p>" + data.sender + ": " + data.msg  + "</p>");
                         scrollBottom();
                         socket.emit("seen", {sphere: data.sphere});

                    } else {
                         // find the sphere the message is meant for and send the user an update notification
                        for(var i = 0; i < sphereNames.length; i++){
                            if(sphereMap[sphereNames[i]].id == data.sphere){
                                sphereMap[sphereNames[i]].updates++;            // increment this spheres updates on client side 
                                var updates = sphereMap[sphereNames[i]].updates;
                                totalUpdates++;                                 // because this sphere's updates have been incremented, so has the total
                                $("#notifications").html(totalUpdates);         
                                $("#updates-" + i ).html(updates);
                            }
                             
                        } 

                    }
                }           
            });

            socket.on('announcement', function(data){
        
                $("#content").append("<p class='announcement'>" + data.msg + "</p>"); // announces the new entrant to others in the sphere
            });


            socket.on('clearChat', function(){
                 $("#content").empty();
            });

            socket.on('chatError', function(data){
                  alertIssue(data);
            });

        };

        this.Disconnect = function(){
            var sphereIDs = [];
            for(var i = 0; i< sphereNames.length; i++){
                sphereIDs.push(sphereMap[sphereNames[i]].id);
            }
            socket.emit('leaveRooms', {spheres: sphereIDs} );
            socket.disconnect();
        }
   
        
        this.Send = function Send(msg) {
         
            socket.emit("send", {sphere: sphereID, msg: msg, sender: name, time: new Date().timeNow()}); 
            
        };

        this.SwitchSphere = function SwitchSphere(current){
            // set the user's name to their name in the new sphere 
            
            name = sphereMap[current].nickname;
            sphereID = sphereMap[current].id;
            sphereIndex = sphereNames.indexOf(current);   
            sphereLink = sphereMap[current].link;
            currentSphere = current;
            socket.emit('requestUsers', {sphereID : sphereID});
            requestMessages();

        }

 

        this.CreateSphere = function CreateSphere(sphereName){
            socket.emit('createSphere', {sphereName: sphereName});
        }

        this.ChangeName = function ChangeName(newName, sphereWide){
             // update name on client side first  
        
           $("#users").children('p').each(function(){
                if($(this).text() == name){
                    alert("found it");
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
           // the user's name in the sphere changes in both scenarios  
           name = newName;

           socket.emit("changeName", {newName: name, sphereWide: sphereWide, sphereIndex: sphereIndex});
               
        }


        Date.prototype.timeNow = function(){ 

            return ((this.getHours() < 10)?"0":"") + 
            ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"
            + ((this.getMinutes() < 10)?"0":"") + this.getMinutes() + ((this.getHours()>12)?('PM'):'AM'); 
        };

         function requestMessages(){

             clearUpdates(); // get rid of notifications for the sphere being accessed 

             socket.emit('requestMessages', {sphereID: sphereID, sphereIndex: sphereIndex}, function(messages){

                $("#content").empty();

                $("#inviteLink").val(sphereLink);

                var conversations = Object.keys(messages);

                if(conversations.length > 0 ){

                    for(var i =0; i < conversations.length; i++){
                    
                       var convoTime = conversations[i];
                       var convo = messages[convoTime];

                       $("#content").append("<h6>" + moment(convoTime).calendar() + "</h6>");

                        for(var msg = 0; msg < convo.length; msg++){
                            $("#content").append(convo[msg]);
                        }
                    }
                    

                    if(members < 2){
                        $("#content").append("<p class='announcement'>Not that talking to yourself is weird or anything... but perhaps you should <a href='#' data-toggle='modal' data-target='#shareModal'> invite </a> some friends?</p>");    
                     }

                } else{
                    $("#content").append("<p class='announcement'>It's pretty quiet in here... Maybe you should <a href='#' data-toggle='modal' data-target='#shareModal'> invite </a> some friends?</p>");    
                }         
                
                scrollBottom();
            });

        }

    
        function clearUpdates(){

            // lets remove the update notifier next to the sphere dropdown 
            var i = sphereNames.indexOf(currentSphere);
            $("#updates-" + i ).html("");  

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


