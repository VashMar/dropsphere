$(document).ready(function(){
    socketxdm = new easyXDM.Socket({
        onMessage: function(message, origin){
            if(message == 'bookmarkletSuccess'){
                console.log("Received '" + message + "' from '" + origin + "'");
            }else if(message.substr(0,8) == "imgDrop:"){
                console.log("image being dropped..")
                var image = message.substr(8, message.length);
                verifyAndCrawl(image);
            }else{
                console.log(message + " sent from " + origin);
                if (typeof(dropLink) != "undefined"){
                    dropLink(message);
                }
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