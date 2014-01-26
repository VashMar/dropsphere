$(document).ready(function(){   

    $('textarea#messageInput').bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
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
        if(msg==""){msg=document.referrer};    
        $("#messageInput").val("");
        chat.Send(msg);

    }