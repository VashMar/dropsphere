$(document).ready(function(){
    var socketxdm = new easyXDM.Socket({
        onMessage: function(message, origin){
            
            console.log("Received '" + message + "' from '" + origin + "'");
			$("textarea").append(message);
        },
        onReady : function() {
			socketxdm.postMessage("testing");

        }
    });
    $("#dropperControl .btn").live('click',function() {
        alert("sending message");
        socketxdm.postMessage("#ds-img");
    });
});