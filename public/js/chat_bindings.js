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


            // get and display the new current sphere when the user chooses to switch
    $("#sphereList").on("click", "a.sphere", function(e){
        currentSphere = $(this).text();        
                
        if(currentSphere != $("a#currentSphere").text()){    //doesn't switch if the user chooses the sphere they're already in
            $("span#currentSphere").html(currentSphere);
            chat.SwitchSphere(currentSphere);
        }

    });

    $("#saveSphere").click(function(){
        // overlay for sphere name input goes here 
        var sphereName = $("#sphereName").val().trim();
        if(sphereName){
          $('#sphereDialog').modal('hide');  
          chat.CreateSphere(sphereName);
        }
    }); 


});

      function sendMsg(){
        
        
        var msg = $("#messageInput").val();  
        if(msg==""){msg=document.referrer};    
        $("#messageInput").val("");
        chat.Send(msg);

    }