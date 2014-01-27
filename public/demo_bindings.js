$(document).ready(function(){

   $("#setName").click(function(){  
      setName();
    });

    $('input#username').bind('keypress', function(e) {
        if(e.keyCode==13){
            setName();
        }
    });
});


 function setName(){
         var name = $("#username").val();
         $.post( "/demologin", {name: name})
         .done(function( data ) {
            $("#name").hide();
            $("#chat").show();
        });

  
        chat = new Chat;
        chat.Connect(name);
    }
