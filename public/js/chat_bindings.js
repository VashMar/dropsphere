$(document).ready(function(){   

    $("textarea#messageInput").bind('keypress', function(e){    
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            sendMsg();
        }
    });

    $("#send").on("click", function(){
        sendMsg();
    });

    // get and display the new current sphere when the user chooses to switch
    $("#sphereList").on("click", "a.sphere", function(e){
        
        var sphereID = $(this).attr('data');

        if(currentSphere != sphereID){    //doesn't switch if the user chooses the sphere they're already in
            chat.SwitchSphere(sphereID);
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

    $("#urlInput").on('paste', function(){

        var self = $(this);
        setTimeout(function(e) {
           var isLink =  checkLink(self.val());

           if(isLink){chat.Preview(self.val());}

        }, 0);

    }); 

    $("#urlInput").on("change keyup paste", function(){
        if($("#urlInput").val().trim() == ""){
             $("#previewContainer").hide();
        }
    });

    $("#postInput").on("change keyup paste", function(){
        if( $("#previewLink").is(":visible") ){
            $("#previewLink span.title").html($("#postInput").val());
        }
    });

    $("#feed").on("click", "a span.title", function(){
        var postID = $(this).parents('.post').attr('data');
        chat.ViewedPost(postID);
    });


    $("#feed").on("click", "a img.chatIcon", function(){
        chat.SelectPost($(this).parents(".post"));
    });


    $("#feed").on("click", "a img.saveIcon", function(){
        var postID = $(this).parents('.post').attr('data');
        chat.SavePost(postID);
    });

    $("#feed").on("click", "a.textPost", function(){
        var post = $(this).parents(".post");
        chat.ViewedPost(post.attr('data'));
        chat.SelectPost(post);
    });

    $("#feed").on("click", "a#editOption", function(){
        var post = $(this).parents('.post');
        var postID = post.attr('data');
        var text = post.find('.title').html();
        $("#editContent").val($.trim(text));
        $("#editContent").attr('data', postID);
    });



    $("#feed").on("click", "a#removeOption", function(){
        var post = $(this).parents('.post');
        var postID = post.attr('data');
        $("#removePost").attr('data', postID);
    });

    $("#contactList").on("click", "a", function(){
        var userID = $(this).parents("li").attr('data');
        chat.OpenPersonal(userID);
        $('#contactList').modal('hide');

    });

    $("#feed").on("click", "a img.shareIcon", function(){
        var post = $(this).parents(".post");
        var postID = post.attr('data');
        $("#shareSelection").attr('data', postID);
    });

    $("#shareSpheres").on("click", "a", function(){
        var sphere = $(this).parents('li').attr('data');
        var postID = $("#shareSelection").attr('data');
        chat.SwitchSphere(sphere);
        chat.setShared(postID);
        $('#sharePost').modal('hide');
    });

    $("#shareContacts").on("click", "a", function(){
        var contact = $(this).parents('li').attr('data');
        var postID = $("#shareSelection").attr('data');
        chat.OpenPersonal(contact);
        chat.setShared(postID);
        $('#sharePost').modal('hide');
    });

    $("#deletableSpheres").on("click", "a", function(){
        var sphere = $(this).parents('li').attr('data');
        chat.DeleteSphere(sphere);
        $('#deleteSphere').modal('hide');
    });

    $("#saveEdits").click(function(){
        var newText = $("#editContent").val().trim();
        var postID =  $("#editContent").attr('data');
        var post =  $(".post[data=" + postID + "]");
        $('#editPost').modal('hide');  
        post.find('.title').html(newText);
        var newContent = post.find('.postContent').html();
        chat.EditPost(postID,newText);
    });



    $("#acceptDeletion").click(function(){
        var postID =  $("#removePost").attr('data')
        var post =  $(".post[data=" + postID + "]");
        $('#removePost').modal('hide'); 
        post.fadeOut(550, "linear");
        chat.DeletePost(postID);
    });

});


    function saveLink(postID){
        alert(postID);
    }

    function feedReturn(){
         chat.FeedReturn();
    }

    function getLink(){
        socketxdm.postMessage('getURL');
    }

    function dropLink(url){
        var link = url;
        $("#urlInput").val(link);
        chat.Preview(link);
    }

    function checkLink(pasted){
        var checkLink = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?");
        return checkLink.test(pasted);
    }
    

    function postMsg(){
        closePreview();
        var post = $("#postInput").val();  
        $("#postInput").val("");
        $("#urlInput").val("");
        chat.Post(post); 
    }

    function closePreview(){
        $("#previewContainer").hide();
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


    function showContactList(){
        $("#shareSpheres").hide();
        $("#shareContacts").show();
    }

    function showSphereList(){
         $("#shareContacts").hide();
         $("#shareSpheres").show();
    }

    function logout(){
       $.get("/logout", function(data){
            chat.Disconnect();
           $("body").html(data);
       });
    }