$(document).ready(function(){

   $("#setName").click(function(){  
      demoLogin();
    });

    $('input#username').bind('keypress', function(e) {
        if(e.keyCode==13){
            demoLogin();
        }
    });
});


 function demoLogin(){
         var name = $("#username").val();
        
        var demologin = $.post( "/demologin", {name: name});
         demologin.done(function( data ) {
            $("#name").hide();
            $("#chat").show();
        }); 

  
        chat = new Chat;
        chat.Connect(name);
    }
