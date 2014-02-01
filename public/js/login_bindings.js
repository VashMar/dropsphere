$(document).ready(function(){

   $("a#account").click(function(){  
       $.get("/join", function(data){

        $("body").html(data);
      });
    });  

    $('#username, #password').bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            login();
        }
    });
});


 function login(){
    var email = $("#email").val();
    var password = $("#password").val();
   
    var login = $.post( "/login", {email: email, password: password});

    login.done(function( data ) {
        $("body").html(data);

        chat = new Chat;
        chat.Connect(name);
     
    });

    login.fail(function( data ) {
        console.log("login failed");
        console.log(data.responseText);
    });
}

