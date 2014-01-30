$(document).ready(function(){
  
   $("#setName").click(function(){  
       login();
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
       /* if(data.redirect){
            window.location = data.redirect; // login in user
        } */
    });

    login.fail(function( data ) {
        console.log("login failed");
        console.log(data.responseText);
    });
}

