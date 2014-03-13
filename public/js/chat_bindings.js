$(document).ready(function(){   

    $("textarea#messageInput").bind('keypress', function(e) {
        
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            sendMsg();
        }
    });

    $("#drop").on("click", function(){
        var link = document.referrer;
        $("#postInput").html(link);
    });

    $("#post").on("click", function(){
        postMsg();
    });
    
    $("#send").on("click", function(){
        sendMsg();
    });


    // get and display the new current sphere when the user chooses to switch
    $("#sphereList").on("click", "a.sphere", function(e){
       
        var current = $(this).children('.sphereName').text().trim();

       if(currentSphere != current){    //doesn't switch if the user chooses the sphere they're already in
            $("span#currentSphere").html(current);
            chat.SwitchSphere(current);
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

    $("#saveName").click(function(){
        // overlay for sphere name input goes here 
        var newName = $("#newName").val().trim();
        var sphereWide = true; // signal name change on all spheres 

        if(newName && newName.length > 3){
          $('#nameChange').modal('hide');  
          chat.ChangeName(newName, sphereWide);
        }
    }); 


    $("#saveNick").click(function(){
        // overlay for sphere name input goes here 
        var newName = $("#newNick").val().trim();
        var sphereWide = false; // signal name change on all spheres 

        if(newName && newName.length > 3){
          $('#nickChange').modal('hide');  
          chat.ChangeName(newName, sphereWide);
        }
    }); 

    $("#postInput").on('paste', function(){

        var self = $(this);
        setTimeout(function(e) {
            checkLink(self.val());
        }, 0);

    });



});

    function checkLink(text){

    }
    
    
    function postMsg(){
        var post = $("postInput").val();  
        if(msg != ""){
            $("#postInput").val("");
            chat.Post(post);
        };    
    }


    function sendMsg(){
        
        var msg = $("#messageInput").val();  
        if(msg != ""){
            $("#messageInput").val("");
            chat.Send(msg);
        };    
       
    }

    function notifySound(){
        document.getElementById('notifySound').play();
    }

    function logout(){
       $.get("/logout", function(data){
            chat.Disconnect();
           $("body").html(data);
       });
    }