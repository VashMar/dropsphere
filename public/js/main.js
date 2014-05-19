$(document).ready(function(){

	feedHeight = ($("#feed").height() > 500 ? '86%' : '80%');

    $('#feed').slimScroll({
    	height: feedHeight,
    	start: 'top'
    });


    /*$('#postInput').slimScroll({
    	width:'100%',
    	railVisible: false
    }); */

});
