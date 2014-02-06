$(document).ready(function(){

   $("a#account").click(function(){  
       $.get("/join", function(data){

        $("body").html(data);
      });
    });  

    $('#loginEmail, #loginPassword').bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            login();
        }
    });
});


 function login(){
    var email = $("#loginEmail").val();
    var password = $("#loginPassword").val();
   
    var login = $.post( "/login", {email: email, password: password});

    login.done(function( data ) {
        $("body").html(data);
        if(!socket){ 
            chat = new Chat; 
            chat.Connect(name);
        }else{
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

