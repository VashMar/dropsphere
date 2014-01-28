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

});
window.addEventListener('message', function(e) {
  var message = e.data;
  alert(message);
});
var socket = new easyXDM.Socket({
    onMessage: function(message, origin){
        alert("Received '" + message + "' from '" + origin + "'");
        socket.postMessage("Indeed it does!");
    }
});