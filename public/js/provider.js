$(document).ready(function(){
    var socket = new easyXDM.Socket({
        onMessage: function(message, origin){
            
            alert("Received '" + message + "' from '" + origin + "'");
			$("textarea").append(message);
        }
    });
});