// load URI.js
var URI = require('URIjs');
var Crawler = require("crawler").Crawler;



exports.getURL = function(msg){

	var start = "<link>";
	var end = "</link>";
	var link = null;
	var result = URI.withinString(msg, function(url){;
	 	return start + url + end;
	 });

	console.log("The result is: " + result);

	if(result.indexOf(start) > -1 && result.indexOf(end) > -1 ){
		var link = result.substring(result.indexOf('<link>')+6, result.indexOf('</link>'));
	} 

	if(link && link.indexOf("http://") < 0){
		link = "http://" + link;
	}

	return link;
}

// discovers if the url is an image
exports.isImage = function(url){
  
    var suffix = /[^.]+$/.exec(url);

    if(suffix == "jpg" || suffix == "jpeg" || suffix == "gif" || suffix == "png"){
        return true; 
    }
 
   	return null;
}

// wraps the links of each message or post in the appropriate tags 
exports.tagWrap =  function(msg, type, title, description, image) {
	
	console.log("Parsing Sent Message..");

    return URI.withinString(msg, function(url, start, end, source){
      var res; 
      var textInclude = "<br>";
      console.log(source);
      if(source === url){textInclude = "";}

      console.log(textInclude);

      if(url.indexOf("http://") < 0){
	 	url = "http://" + url;
	  }
     
      // if the post is a youtube video embed it to the page 
      if(url.indexOf("www.youtube.com/watch?") > -1){
        var video = msg.split('v=')[1];

        if(video.indexOf('&') > -1){
          video = video.split('&')[0];
        }
        res = "<iframe width='250' height='200' frameborder='0' src='//www.youtube.com/embed/" + video + "' allowfullscreen></iframe>";
      } else{
 

        res = textInclude + "<a target='_blank' class='post_" + type + "' href='" + url + "'>";
       
        // check if post is an image and wrap in image tag 
        if(type == "image"){
            res += "<img style='max-width:200px; max-height: 200px;' src='" + url + "'/>";
            res += "</a>";
        }
      
        if(type == "link"){
        	var imageTag = "";

        	res += (title) ? title + "</a>" :  url + "</a>";

         	if(image){
         		imageTag = "<img style='max-width:100px; max-height: 100px;' src='" + image + "'/>";
         	}
         	if(description){
         		description = description.substring(0,120);
         		description += "...";
				res += "<span>" + imageTag + description + "</span>";
         	} else{
         		res += "<span>" + imageTag + "</span>";
         	}
        }
      
      }

      return res; 
    });

    
 }