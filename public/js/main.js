$(document).ready(function(){
    $('#content').slimScroll({
    	height: '100%',
    	start: 'bottom'
    });
    $('textarea').slimScroll({
    	width:'100%'
    });
    /*
    $("textarea").focus(function(){
    	$("#send").removeClass("blank").attr("value","send");
    });
    $( "textarea" ).change(function() {
		if($(this).val() == ""){
			$("#send").addClass("blank").attr("value","");
		}
	});
*/
$("#content").click(function(){
    $("#content").prepend("<div class='alert'>asdf asdf asdf</div>")
    $('.alert').delay(5000).fadeOut(400);
    $('.alert').click(function(){
        $(this).fadeOut();
    });
});

});
