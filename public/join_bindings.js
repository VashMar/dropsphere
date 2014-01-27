$(document).ready(function(){
   $("#setName").click(function(){  
       alert("hit!");
       signup();
    });

});


 function signup(){
    var name = $("#username").val(),
        email = $("#email").val(),
        password = $("#password").val();

    $.post( "/signup", {name: name, email: email, password: password})
    .done(function( data ) {
        console.log(data);
    });
}