$(document).ready(function(){
    socketxdm = new easyXDM.Socket({
        onMessage: function(message, origin){
            if(message == 'bookmarkletSuccess'){
                console.log("Received '" + message + "' from '" + origin + "'");
            }else{
                console.log(message + " sent from " + origin);
                dropLink(message);
            }
            
        },
        onReady : function() {
			socketxdm.postMessage("testing");

        }
    });
    $("#dropperControl .btn").on('click',function() {
    	var index = $(this).index();
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