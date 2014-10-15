$(document).ready(function(){   

    $("textarea#messageInput").bind('keypress', function(e){    
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            sendMsg();
        }
    });

    $("#contactAdding input").bind('keypress', function(e){
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            addContact();
        }
    });


    $("#postInput").bind('keypress', function(e){
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            postMsg();
        }
    });

    $("#newNick").bind('keypress', function(e){
        if(e.keyCode==13 && !e.shiftKey){
            e.preventDefault();
            saveNick();
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
        saveNick();
    }); 

    $("#contactAdd").click(function(){
        addContact();
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


    $("#feed").on("click", "a#chatIcon, a#unseenChat", function(){
        chat.SelectPost($(this).parents(".post"));
    });


    $("#feed").on("click", "a#saveIcon", function(){
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

    $("#contacts").click(function(){
        $("#newRequests").hide();
        $("#newRequests").html("");
        chat.RequestsSeen();
    })

    $("#contactNames").on("click", "a", function(){
        var userID = $(this).parents("li").attr('data');
        chat.OpenPersonal(userID);
        $('#contactList').modal('hide');

    });

    $("#addContact").click(function(){
        $("#contactListContainer").hide();
        $("#contactAdding").show();
        $("#addContact").hide();
        $("#backToContacts").show();
        $("#contactList .modal-title").html("Add Contact");
    });

    $("#backToContacts").click(function(){
        $("#contactListContainer").show();
        $("#contactAdding").hide();
        $("#addContact").show();
        $("#backToContacts").hide();
        $("#contactList .modal-title").html("Contacts");
    });

    $("#feed").on("click", "a#shareIcon", function(){
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


    $("#nickAddingSpheres").on("click", "a", function(){
        $(this).toggleClass("selected");
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

    function addContact(){
        var newContact = $("#contactAdding input").val().trim();
        chat.AddContact(newContact);
    }

    function showContactList(){
        $("#shareSpheres").hide();
        $("#shareContacts").show();
    }

    function showSphereList(){
         $("#shareContacts").hide();
         $("#shareSpheres").show();
    }


    function saveNick(){
        var nickname = $("#newNick").val().trim();
       var nicknamedSpheres = [];

        $("#nickAddingSpheres .selected").each(function(){
            nicknamedSpheres.push($(this).parents('li').attr('data'));
        });

        chat.SetNickname(nicknamedSpheres,nickname);
    }


    function logout(){
       $.get("/logout", function(data){
            chat.Disconnect();
           $("body").html(data);
       });
    }