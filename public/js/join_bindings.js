$(document).ready(function(){

    $('body').on('keypress', 'input#joinEmail,input#joinPassword,input#username', function(e){

        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            signup();
        }
    }); 

});


 function signup(){

    var name = $("#username").val().trim();
    var email = $("#joinEmail").val().trim();
    var password = $("#joinPassword").val();



    var submit = $.post( "/signup", {name: name, email: email, password: password});

    submit.done(function( data ){
       console.log(data);
       location.href = location.origin;
    });

    submit.fail(function(data){
        var res = data.responseJSON;
        var errors = res.errors;

        if(res.name == "ValidationError"){

            if("password" in errors ){
               if(errors.password.type == "required"){
                $("#joinPassError").html("This field is required");
               }

               if(errors.password.type == "user defined"){
                $("#joinPassError").html(errors.password.message);
               }
            }

            if("email" in errors){
               if(errors.email.type == "required"){
                $("#joinEmailError").html("This field is required");
               }

               if(errors.email.type == "user defined"){
                $("#joinEmailError").html(errors.email.message);
               }

            }

            if("name" in errors){
               if(errors.name.type == "required"){
                $("#usernameError").html("This field is required");
               }

               if(errors.name.type == "user defined"){
                $("#usernameError").html(errors.name.message);
               }

            }
        }

        if(res.name == "MongoError"){
            $("#joinEmailError").html("Email already exists");
        }
        
    });
}

