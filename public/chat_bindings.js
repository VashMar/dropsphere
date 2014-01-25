$(document).ready(function(){   

    $('input#messageInput').bind('keypress', function(e) {
        if(e.keyCode==13){
            sendMsg();
        }
    });
    
    $("#send").click(function()
    {
        sendMsg();
    });


});

      function sendMsg(){
        var msg = $("#messageInput").val();      
        $("#messageInput").val("");
        chat.Send(msg);

    }