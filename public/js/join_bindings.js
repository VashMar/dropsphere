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

    submit.done(function( data ){
     
       $("body").html(data);

        chat = new Chat;
        chat.Connect(name);
    });

    submit.fail(function(data){
        console.log("signup failed");
        console.log(data.responseText);
    });
}