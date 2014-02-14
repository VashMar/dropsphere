$(document).ready(function(){


    $('#loginEmail, #loginPassword').bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            login();
        }
    });
});

 function getJoin(){
     $.get("/join", function(data){
        $("body").html(data);
      });
 }


 function login(){
    var email = $("#loginEmail").val();
    var password = $("#loginPassword").val();
   
    var login = $.post( "/login", {email: email, password: password});

    login.done(function( data ) {
        $("body").html(data);

        // if the page is freshly loaded create the chat object 
        if(!socket){ 
            chat = new Chat; 
            chat.Connect(username);
        }else{
            // otherwise the socket and listeners already exist
             socket.socket.connect();
        }
    
     
    });

    login.fail(function( data ) {
        console.log("login failed");
        if(data.responseJSON.type == "email"){
            $("#loginEmailError").html(data.responseJSON.message);
        }else{
            $("#loginPassError").html(data.responseJSON.message);
        }
    });
}

