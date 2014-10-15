$(document).ready(function(){


    $("#loginEmail, #loginPassword").bind('keypress', function(e) {
            
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


 function login(){
    var email = $("#loginEmail").val();
    var password = $("#loginPassword").val();
   
    var login = $.post( "/login", {email: email, password: password});

    login.done(function(data){
        $("body").html(data);

        // if the page is freshly loaded create the chat object 
        if(!socket){ 
            chat = new Chat; 
            chat.Connect(username);
        }else{
            // otherwise the socket and listeners already exist
            socket.connect();
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

