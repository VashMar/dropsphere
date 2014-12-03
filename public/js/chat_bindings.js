$(document).ready(function(){   

    $('#messageBox').on('keypress', 'textarea#messageInput', function(e){

            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                sendMsg();
            }
    }); 



    $('#contactList').on('keypress', '#contactAdding input', function(e){
            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                addContact();
            }
    }); 

    $('#sphereDialog').on('keypress', 'input#sphereName', function(e){
             if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                createSphere();
            }
    });


    $('#content').on('keypress', '#postInput', function(e){
            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                postMsg();
            }
    }); 


    $('#nickChange').on('keypress', '#newNick', function(e){

            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                saveNick();
            }
    }); 

    $('#editPost').on('keypress', 'textarea#editContent', function(e){

            if(e.keyCode==13 && !e.shiftKey){
                e.preventDefault();
                editPost();
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
        createSphere();
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

           if(isLink){chat.Crawl(self.val());}

        }, 0);

    }); 

    $("#urlInput").on("change keyup paste", function(){
        if($("#urlInput").val().trim() == ""){
             $("#previewContainer").hide();
        }
    });

    $("#postInput").on("change keyup paste", function(){
        if( $("#previewLink").is(":visible") ){
            var caption = $("#postInput").val();

            var spaced = false;
            for(var i=0; i< caption.length; i++){
                if(caption[i] == " "){
                    spaced = true;
                }

                // check every 40 chars for a space
                if(i > 0 && i%25 == 0 && !spaced){
                    caption = caption.substr(0, i) + "<br>" + caption.substr(i);   
                    spaced = false; 
                }

            }
            $("#previewLink span.title").html(caption);
        }
    });


    $("#searchInput").on("change keyup paste", function(){
       var keyword = $("#searchInput").val().toLowerCase();
       chat.Search(keyword);  
    });

    $("#container").on("click", "a#filterLinks", function(){
        chat.FilterType("link");
    });

    $("#container").on("click", "a#filterImages", function(){
        chat.FilterType("image");
    });


    $("#container").on("click", "a#filterText", function(){
        chat.FilterType("text");
    });

    $("#container").on("click", "a#filterUnread", function(){
        chat.FilterType("unread");
    });

    $("#container").on("click", "a#filterRecent", function(){
        chat.FilterRecent();
    });

    $("#container").on("click", "a#filterUnread", function(){

    });

    $("#feed").on("click", "a span.title", function(){
        var postID = $(this).parents('.post').attr('data');
        chat.ViewedPost(postID);
    });


    $("#feed").on("click", "a.chatIcon, a.unseenChat", function(){
        $("#search").hide();
        chat.SelectPost($(this).parents(".post"));
    });


    $("#feed").on("click", "a.saveIcon", function(){
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
    });

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
        $("#contactsContent h5 span").attr('class', 'glyphicon glyphicon-circle-arrow-left');
    });

    $("#backToContacts").click(function(){
        $("#contactListContainer").show();
        $("#contactAdding").hide();
        $("#addContact").show();
        $("#backToContacts").hide();
        $("#contactList .modal-title").html("Contacts");
        $("#contactsContent h5 span").attr('class', 'glyphicon glyphicon-plus-sign');
    });

    $("#feed").on("click", "a.shareIcon", function(){
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

    $("#shareSelection").on("click", "li", function(){
        $('#shareSelection li.active').removeClass('active');
        $(this).addClass('active');
    });

    // trigger the check overlay to make sure the user wants to delete the selected sphere
   $("#deletableSpheres").on("click", "a", function(){
        var name = $(this).html();
        var sphere = $(this).parents('li').attr('data');
        $("#sphereDeleteCheck span").html(name);
        $("#sphereDeleteCheck").modal();
        $("#acceptSphereDeletion").attr('data', sphere);    //track the id in the dom 
        // chat.DeleteSphere(sphere);
        $("#deleteSphere").modal('hide');
    }); 


   $("#acceptSphereDeletion").click(function(){
        var sphere = $("#acceptSphereDeletion").attr('data'); // get the id
        chat.DeleteSphere(sphere); 
        $("#sphereDeleteCheck").modal('hide');

        //remove sphere from deletable list
        $("#deletableSpheres li[data='" + sphere + "']").remove();
   });

   $("#rejectSphereDeletion").click(function(){
         $("#sphereDeleteCheck").modal('hide');
   });

   $("#sphereDelete").click(function(){
        if($("#deletableSpheres li").length < 1 && $("#deleteSphere p").length < 1){
         $( "<p> You don't have any sphere's to delete. Perhaps you should create some.. </p>").insertBefore("#deletableSpheres");
        }
   });

    $("#editPost").on("click", "#saveEdits", function(){
        editPost();
    });


    $("#inviteContacts").on("click", "a", function(){
         $(this).toggleClass("selectedInvite");
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

    $("#rejectDeletion").click(function(){
        $('#removePost').modal('hide'); 
    });

    $("#contactList").on("click", "a#acceptRequest", function(){
        var item = $(this).parents('li');
        var requester =  item.children("#requesterName").html();
        var requesterID = item.attr('data');
        chat.AcceptRequest(requesterID);
        item.remove();
        checkRemainingRequests();
        //add contact to both contact names, shareable and invite contacts 
        var contactItem = "<li data='" + requesterID + "'><span class='glyphicon glyphicon-user'></span><a href='#'>" + requester + "</a></li>";
        var invContact = "<li><a href='#' data='" + requesterID + "'><span class='glyphicon glyphicon-user'></span><span class='beingInvited'>" + requester + "</span></a></li>";
        $("#contactNames").append(contactItem);
        $("#shareContacts").append(contactItem);
        $("#inviteContacts").append(invContact);
        $("#inviteSelectLabel").show();
    });


    $("#contactList").on("click", "a#ignoreRequest", function(){
        var item = $(this).parents('li');
        var requesterID = item.attr('data');
        chat.IgnoreRequest(requesterID);
        item.remove();
        checkRemainingRequests();
    });


    $("#contactList").on("click", "a#acceptInvite", function(){
        var item = $(this).parents('li');
        var sphereID = item.attr('data');
        chat.AcceptInvite(sphereID);
        $("#contactList").modal('hide');
        item.remove();
        checkRemainingInvites();

    });

    $("#contactList").on("click", "a#ignoreInvite", function(){
        var item = $(this).parents('li');
        var sphereID = item.attr('data');
        chat.IgnoreInvite(sphereID);
        item.remove();
        checkRemainingInvites();
    });

    $("#inviteToSphere").click(function(){
        var invited = [];
        var selected = [];
        // collect all invited users and selected DOM elements
        $("#inviteContacts .selectedInvite").each(function(){
            invited.push($(this).attr('data'));
            selected.push($(this));
        });

        //send the invited users along to the socket event handler 
        chat.SendInvite(invited);

        //close the modal 
        $("#shareModal").modal('hide');

        //remove the selected flags
        selected.forEach(function(element){
            element.toggleClass("selectedInvite");
        });
    });

});

    
    function feedReturn(){
         chat.FeedReturn();
    }

    function getLink(){
        socketxdm.postMessage('getURL');
    }

    function drop(ev){
        ev.preventDefault();
        var link = ev.dataTransfer.getData("text");
        var isLink =  checkLink(link);

        if(isLink){
            $("#urlInput").val(link);
            chat.Crawl(link);
        }
    }

    function dropLink(preview){
        var items = preview.split(',');
        var hash = {};
        var key;
        var val;
        items.forEach(function(item){
            key = item.substring(0, item.indexOf(':'));
            val = item.substring(item.indexOf(':')+1);
            hash[key] = val;    // data[key] = value
        });

        var link = hash['url'];
        $("#urlInput").val(link);
        chat.Preview(hash);
    }

    function editPost(){
        var newText = $("#editContent").val().trim();
        var postID =  $("#editContent").attr('data');
        var post =  $(".post[data=" + postID + "]");
        $('#editPost').modal('hide');  
        post.find('.title').html(newText);
        var newContent = post.find('.postContent').html();
        chat.EditPost(postID,newText);
    }

    function checkLink(pasted){
        var checkLink = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?");
        return checkLink.test(pasted);
    }

    function createSphere(){
        
        var sphereName = $("#sphereName").val().trim();

        if(sphereName){
          $('#sphereDialog').modal('hide');  
          chat.CreateSphere(sphereName);
        }
    }
    

    function postMsg(){
        closePreview();
        var post = $("#postInput").val();  
        $("#postInput").val("");
        $("#urlInput").val("");
        chat.Post(post); 
        $( ".announcement" ).remove();
    }

    function closePreview(){
        $("#previewContainer").hide();
        $("#urlInput").val("");
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

    function checkRemainingRequests(){
        if($("#pendingRequests li").length < 1){
            $("#requestLabel").hide();
        }
    }

    function checkRemainingInvites(){
        if($("#pendingInvites li").length < 1){
            $("#inviteLabel").hide();
        }
    }

    function logout(){
       $.get("/logout", function(data){
            chat.Disconnect();
           $("body").html(data);
       });
    }