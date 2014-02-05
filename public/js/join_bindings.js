$(document).ready(function(){

    $('#joinEmail, #joinPassword', '#username').bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            signup();
        }
    });

});


 function signup(){

    var name = $("#username").val();
    var email = $("#joinEmail").val();
    var password = $("#joinPassword").val();

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