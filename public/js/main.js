$(document).ready(function(){

	var height = ($("#feed").height() > 500 ? '86%' : '75%');

    $('#feed').slimScroll({
    	height: height,
    	start: 'top'
    });


    /*$('#postInput').slimScroll({
    	width:'100%',
    	railVisible: false
    }); */

});
