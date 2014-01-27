$(document).ready(function(){
   $("#setName").click(function(){  
       signup();
    });

});


 function signup(){
    var name = $("#username").val();
    var email = $("#email").val();
    var password = $("#password").val();

    var submit = $.post( "/signup", {name: name, email: email, password: password});

    submit.done(function( data ) {
         console.log("signup done");
        if(data.redirect){
            window.location = data.redirect; // login in user
        }
    });

    submit.fail(function( data ) {
        console.log("signup failed");
        console.log(data.responseText);
    });
}