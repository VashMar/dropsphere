$(document).ready(function(){
    socket = new easyXDM.Socket({
	    onReady : function() {

        },
        onMessage: function(message, origin){
            
            console.log("Received '" + message + "' from '" + origin + "'");
			$("textarea").append(message);
        }
    });
});