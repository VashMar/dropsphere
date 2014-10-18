$(document).ready(function(){

    $('body').on('keypress', '#loginEmail, #loginPassword', function(e){

            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                login();
            }
    }); 

    $('body').on('keypress', 'input#resetEmail', function(e){

            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                resetPass();
            }
    }); 

    $('body').on('click', 'inpu#loginSet', function(){
            login();
    });

});



function resetPass(){
    var email = $("#resetEmail").val().trim();
    var sendReset = $.post("/sendReset", {email:email});

    sendReset.done(function(){
        $("#resetFail").hide();
        $("#resetEmail").css("border-color", "green");
        var msg =  $("#resetSent").is(':visible') ? "Your reset link has been sent again!" : "Your reset link has been sent!";
        
        $("#resetSent").html(msg);
        $("#resetSent").fadeIn();
        $("#resetPass").html("Resend");
    });

    sendReset.fail(function(){
        $("#resetSent").hide();
        $("#resetEmail").css("border-color", "red");
        $("#resetFail").html("This email was not found");
        $("#resetFail").fadeIn();
    });

}

 function getJoin(){
     $.get("/join", function(data){
        $("body").html(data);
      }); 
 }


var login = function(){
    var email = $("#loginEmail").val();
    var password = $("#loginPassword").val();
    var loginAttempt = $.post( "/login", {email: email, password: password});

    loginAttempt.done(function(data){
        $("body").html(data);
     
    });

    loginAttempt.fail(function( data ){
        console.log("login failed");
        if(data.responseJSON.type == "email"){
            $("#loginEmailError").html(data.responseJSON.message);
        }else{
            $("#loginPassError").html(data.responseJSON.message);
        }
    });
}

