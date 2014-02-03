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
    	var index = $(this).index();
    	alert("sending message");
    	if(index==0){
    		//text mode
    		 socketxdm.postMessage("#ds-text");
    	}else if(index==1){
    		//image mode
    		 socketxdm.postMessage("#ds-img");
    	}else if(index==2){
    		//link mode (default)
    		 socketxdm.postMessage("#ds-link");
    	}
        
       
    });
});