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

 
	if(link && (link.indexOf("http://") < 0 || link.indexOf("https://") < 0 )){
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
exports.tagWrap = function(msg, type, title, image){
	
	console.log("Parsing Sent Message..");

    return URI.withinString(msg, function(url, start, end, source){
      var res; 
      var textInclude = "<br>";
      console.log(source);
      if(source === url){textInclude = "";}

      console.log(textInclude);

        res = textInclude + "<a target='_blank' class='post_" + type + "' href='" + url + "'>";
       
        // check if post is an image and wrap in image tag 
        if(type == "image"){
        	if(url.indexOf("http://") < 0 && url.indexOf("https://") < 0){
	 			   url = "http://" + url;
	  		  }
     
          res += "<img src='" + url + "'/><span class='title image'></span>";
          res += "</a>";
        }
      
        if(type == "link"){
        	var imageStyle = " ";

        	if(image){
         		res+= "<img src='" + image + "'/>";
         	}else{
         		imageStyle= " style='float:none; padding:5px;'";
         	}

        	res += (title) ? "<span" + imageStyle + "class='title'>" + title + "</span></a>" :  url + "</a>";
        }

        if(type == "msgLink"){
          res = "<a target='_blank' href='" + url + "'>" + url + "</a>";
        } 
      
      return res; 
    });

    
 }

 exports.hashMeBaby = function(dataStr, next){
    console.log("hashing string: " + dataStr);
    var data2hash = dataStr.split(",");
    var keyVal;
    data = {}; // create a hash from the string inputs 

    for(var i = 0; i< data2hash.length; i++){
        keyVal = data2hash[i]; // key : value => [key,value]
        key = keyVal.substring(0,keyVal.indexOf(':'));
        val = keyVal.substring(keyVal.indexOf(':')+1);
        data[key] = val;    // data[key] = value
        if(i == data2hash.length -1 ){
          next(data);
        }

    }
         
  }


 exports.arrayMeBaby = function(dataStr, next){
     var data2array = dataStr.split(",");
     next(data2array);
 }

  exports.isEmail = function(email,next){
    var p = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    next(p.test(email));
  };