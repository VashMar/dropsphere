




function scrollBottom(){
    var chatBox = document.getElementById("content");
    chatBox.scrollTop = chatBox.scrollHeight;
}



function Chat(){

        this.socket = null;
        this.name = "";
      
        

        this.Connect = function(username){ 
            socket =  io.connect();      
            name = username;
            

              socket.on('users', function(users){

                    $("#users").empty();

                    for(var i = 0; i < users.length; i++){
                        $("#users").append("<p>" + users[i] + "</p>");
                    }
                });

              socket.on('sphereMap', function(data){
               
                   sphereMap = data.sphereMap;
                   sphereNames = Object.keys(sphereMap);
                   currentSphere = sphereNames[data.index];
        
                   
                   $("span#currentSphere").html(currentSphere).append("<span class='caret'></span>");   
                   $(".sphere").parent().remove();

                   for(var i = 0; i < sphereNames.length; i++){
                     $("<li role='presentation'><a class='sphere' href='#' tabindex='-1' role='menuitem'><span class='glyphicon glyphicon-ok-circle'></span> &nbsp;" + sphereNames[i] + "</a></li>")
                     .insertBefore("#sphereDivider");
                   }
                   
                    // track sphere data 
                    sphereID = sphereMap[currentSphere].id;
                    sphereIndex = sphereNames.indexOf(currentSphere);
                    sphereLink = sphereMap[currentSphere].link;

                    if(data.justmade === undefined){
                        requestMessages();
                    }
                
                   
              });

                socket.on('fillMessages', function(messages){
                   for(var i =0; i < 25; i++){
                        $("#content").append(messages[i]);      
                    }             
                    scrollBottom();
                }); 


            // 
            socket.on('message', function(data){
                   
                    if(data.msg) {    
                        $("#content").append("<p>" + data.sender + " (" + data.time + ")" + ": " + data.msg  + "</p>");
                        scrollBottom();

                    } else {
                         console.log("There is a problem:", data); 
                    }           
            });

            socket.on('announcement', function(data){
        
                $("#content").append(data.msg); // announces the new entrant to others in the sphere
            });





        };
   
        
        this.Send = function Send(msg) {

            socket.emit("send", {sphere: sphereID, msg: msg, sender: name, time: new Date().timeNow()}); 
            
        };

        this.SwitchSphere = function SwitchSphere(current){
            // set the user's name to their name in the new sphere 
            
            name = sphereMap[current].username;
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
            alert($("#users").children());
            //name = newName;
               
        }


        Date.prototype.timeNow = function(){ 

            return ((this.getHours() < 10)?"0":"") + 
            ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"
            + ((this.getMinutes() < 10)?"0":"") + this.getMinutes() + ((this.getHours()>12)?('PM'):'AM'); 
        };

         function requestMessages(){
             
             socket.emit('requestMessages', {sphereID: sphereID, sphereIndex: sphereIndex}, function(messages){

                $("#content").empty();

                $("#content").append("<p> Sphere Link: " + sphereLink + "</p>");
  
                for(var i =0; i < 25; i++){
                    $("#content").append(messages[i]);      
                }             
                
                scrollBottom();
         });

        }


    } // end chat


