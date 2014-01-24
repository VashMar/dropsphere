$(document).ready(function(){
	 messages = [];
     chat = new Chat;
     chat.Connect(name);


    $('input#messageInput').bind('keypress', function(e) {
        if(e.keyCode==13){
            sendMsg();
        }
    });
    
    $("#send").click(function()
    {
        sendMsg();
    });

    function sendMsg(){

        var msg = $("#messageInput").val();
        $("#messageInput").val("");
        chat.Send(msg);

    }
    

	 function Chat(){
        this.socket = null;
        this.name = "";
        
        this.Connect = function(username){ 
            socket =  io.connect();      
            name = username;

            //
            socket.on('connect',function (data) {
                socket.emit('setName', {name: name, time: new Date().timeNow()}, function(response){
                    $("#content").append("<p>" + response.msg + "</p>");      // sphere entrance message 
                });
            });
            //
            socket.on('message', function(data){
                    
                    if(data.msg) {

                        messages.push(data.msg);
                        // posts on message board 
                        $("#content").append("<p>" + data.sender + " (" + data.time + ")" + ": " + data.msg  + "</p>");

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
  
});