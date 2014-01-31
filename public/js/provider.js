$(document).ready(function(){
    var socket = new easyXDM.Socket({
        onMessage: function(message, origin){
            
            console.log("Received '" + message + "' from '" + origin + "'");
			$("textarea").append(message);
        }
    });
});