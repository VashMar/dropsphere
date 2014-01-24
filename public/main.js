$(document).ready(function(){
    $('#content').slimScroll({
    	height: '100%'
    });
    $('textarea').slimScroll({
    	height: '100%',
    	width:'100%'
    });
	$("#content").animate({ scrollTop: $(document).height() }, "slow");


});
