


$(document).ready(function(){
    chat = new Chat;
    chat.Connect(name);
});

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

            
            socket.on('connect',function (data) {
                //gets and shows the last 25 messages that were sent in chat 
                socket.emit('requestMessages', function(messages){
                   for(var i =0; i < 25; i++){
                        $("#content").append(messages[i]);      
                    }             
                    scrollBottom();
                });

            });

              socket.on('users', function(users){

                    $("#users").empty();


                    for(var i = 0; i < users.length; i++){
                        $("#users").append("<p>" + users[i] + "</p>");
                    }
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
                $("#content").append("<p>" + data.msg  + "</p>"); // announces the new entrant to others in the sphere
            });
        };
        
        this.Send = function Send (msg) {

            socket.emit("send", {msg: msg, sender: name, time: new Date().timeNow()}); 
            
        };


        Date.prototype.timeNow = function(){ 

            return ((this.getHours() < 10)?"0":"") + 
            ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"
            + ((this.getMinutes() < 10)?"0":"") + this.getMinutes() + ((this.getHours()>12)?('PM'):'AM'); 
        };

    } // end chat