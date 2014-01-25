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
         $.post( "/login", {name: name})
         .done(function( data ) {
            $("#name").hide();
            $("#chat").show();
        });

        /*$.get('/login', function(data) {
            $("#name").hide();
            $("#chat").show();
        });*/
        chat = new Chat;
        chat.Connect(name);
    }