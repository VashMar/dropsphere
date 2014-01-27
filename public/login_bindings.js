$(document).ready(function(){
   alert("ready");
   $("#setName").click(function(){  
       login();
    });
  
});


 function login(){
    var email = $("#email").val();
    var password = $("#password").val();
   
    var login = $.post( "/login", {email: email, password: password});

    login.done(function( data ) {
         console.log("signup done");
        if(data.redirect){
            window.location = data.redirect; // login in user
        }
    });

    login.fail(function( data ) {
        console.log("signup failed");
        console.log(data.responseText);
    });
}


}
