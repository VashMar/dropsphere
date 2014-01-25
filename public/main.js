$(document).ready(function(){
    $('#content').slimScroll({
    	height: '100%',
    	start: 'bottom'
    });
    $('textarea').slimScroll({
    	height: '100%',
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
});
