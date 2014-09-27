$(document).ready(function(){

	feedHeight = ($("#feed").height() > 500 ? '86%' : '80%');

    $('#feed').slimScroll({
    	height: feedHeight,
    	start: 'top'
    });

   $("#feed").css("height", "89%");

    $("#feed").tooltip({
     	html: true,
     	selector: "[data-toggle='showViewers']",
     	container:'.postButtons'
    });

    /*$('#postInput').slimScroll({
    	width:'100%',
    	railVisible: false
    }); */

});
