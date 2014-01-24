
  
    messages = [];
    var chat = null;
/*
    // stores every sent message and displays 
    socket.on('message', function (data) {
        if(data.message) {
            messages.push(data.message);
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += messages[i] + '<br />';
            }
            content.innerHTML = html;
        } else {
            console.log("There is a problem:", data);
        }
    });

    // gets message and fires send event 
    sendButton.onclick = function() {
        var text = field.value;
        socket.emit('send', { message: text });
    };
*/

$(document).ready(function(){
  
    socket =  io.connect();   
 
    $("#setName").click(function(){  
       setName();
    });

    $('input#username').bind('keypress', function(e) {
        if(e.keyCode==13){
            setName();
        }
    });

    $('input#messageInput').bind('keypress', function(e) {
        if(e.keyCode==13){
            sendMsg();
        }
    });
    
    $("#send").click(function()
    {
        sendMsg();
    });

});


    function sendMsg(){

        var msg = $("#messageInput").val();
        
        $("#messageInput").val("");
        chat.Send(msg);

    }
    
    function setName(){
         var name = $("#username").val();
        $.post( "/login", {name: name})
         .done(function( data ) {
            $("#name").hide();
            $("#chat").show();
        });

        /*$.get('/login', function(data) {
            $("#name").hide();
            $("#chat").show();
        });*/
        chat = new Chat;
        chat.Connect(name);
    }
    function Chat(){
        this.socket = null;
        this.name = "";
        
        this.Connect = function(username){ 
            socket.socket.reconnect();   
            name = username;

            //
            socket.on('connect',function (data) {
                socket.emit('setName', {name: name, time: new Date().timeNow()}, function(response){
                    $("#content").append("<p>" + response.msg + "</p>");      // sphere entrance message 
                });

            });


              socket.on('users', function(users){

                $("#users").empty();

                if(users.length == 1){
                    $("#users").append("<h3>" + users.length + " user online <h3>");        
                }else{
                    $("#users").append("<h3>" + users.length + " users online <h3>");
                }

                for(var i = 0; i < users.length; i++){
                    $("#users").append("<p>" + users[i] + "</p>");
                }
                
               });

            //
            socket.on('message', function(data){
                    
                    if(data.msg) {

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
  
 