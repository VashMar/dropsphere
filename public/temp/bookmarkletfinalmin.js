!function(){function e(e,t){var n=document.createElement("script");n.src=e;var o=document.getElementsByTagName("head")[0],r=!1;n.onload=n.onreadystatechange=function(){r||this.readyState&&"loaded"!=this.readyState&&"complete"!=this.readyState||(r=!0,t(),n.onload=n.onreadystatechange=null,o.removeChild(n))},o.appendChild(n)}function t(){e("http://code.jquery.com/ui/1.10.4/jquery-ui.js",function(){return"undefined"==typeof jQuery?l="Sorry, but jQuery wasn't able to load":(l="This page is now jQuerified with UI"+jQuery.fn.jquery,a&&(l+=" and noConflict(). Use $jq(), not $().")),e("http://localhost:3500/easyxdm/easyxdm.debug.js",function(){console.log("xdm loaded"),o(),r(),console.log("bookmarklet loaded")}),n()})}function n(){d.innerHTML=l,s.appendChild(d),window.setTimeout(function(){"undefined"==typeof jQuery?s.removeChild(d):(jQuery(d).fadeOut("slow",function(){jQuery(this).remove()}),a&&($jq=jQuery.noConflict()))},2500)}function o(){dropsphere=!0;var e=document.createElement("div");e.setAttribute("id","dropsphere"),e.style.width="300px",e.style.height="100%",e.style.background="#f6f6f6",e.style.position="fixed",e.style.top="0",e.style.right="0",e.style.zIndex="9999999",e.style.borderLeft="1px solid #ddd",document.body.appendChild(e);var t=document.createElement("div");t.setAttribute("id","close"),t.onclick=function(){var e=document.getElementById("dropsphere");e.parentNode.removeChild(e),dropsphere=!1},e.appendChild(t);var n=document.createElement("div");n.setAttribute("id","dropper"),n.style.width="300px",n.style.height="100%",e.appendChild(n);var o=document.createElement("style");o.type="text/css",o.innerHTML="#dropsphere\n      {\n        animation:slide .5s;\n        -webkit-animation:slide .5s;\n      }\n      @keyframes slide\n      {\n      from {right:-300px;}\n      to {right:0;}\n      }\n      @-webkit-keyframes slide\n      {\n      from {right:-300px;}\n      to {right:0;}\n      }\n      #close{\n      cursor:pointer;\n      position:absolute;\n      top:0;\n      right:0;\n      margin:2px 6px 0 0;\n      height:30px;\n      width:30px;\n      background:url(http://localhost:3500/img/close.png) no-repeat;\n      }\n      #close:hover{\n      background:url(http://localhost:3500/img/close_hover.png) no-repeat;\n      }\n      #dropsphere iframe{\n        border:none;\n        height:100%;\n      }\n      #dropper{\n        position:absolute;\n        top:0;\n         pointer-events:none;\n      }\n      ",document.body.appendChild(o)}function r(){socketxdm=new easyXDM.Socket({remote:"http://localhost:3500/bookmark",container:"dropsphere",onMessage:function(e,t){console.log("Received '"+e+"' from '"+t+"'"),"#draggify"==e&&i()},onReady:function(){socketxdm.postMessage("Yay, it works!")}}),i()}function i(){$("p, a, h1, h2, h3, h4").draggable({stack:"div",zIndex:99999999,start:function(){$(this).height(100).width(100)}}),$("#dropper").droppable({drop:function(){$(this).addClass("ui-state-highlight").find("p").html("Dropped!")}})}if("undefined"==typeof dropsphere||0==dropsphere){dropsphere=!0;var d=document.createElement("div"),s=document.getElementsByTagName("body")[0],a=!1,l="";d.style.position="fixed",d.style.height="32px",d.style.width="220px",d.style.marginLeft="-110px",d.style.top="0",d.style.left="50%",d.style.padding="5px 10px",d.style.zIndex=1001,d.style.fontSize="12px",d.style.color="#222",d.style.backgroundColor="#f99","undefined"!=typeof jQuery?l="This page already using jQuery v"+jQuery.fn.jquery:"function"==typeof $&&(a=!0),e("http://code.jquery.com/jquery.min.js",function(){"undefined"==typeof jQuery?l="Sorry, but jQuery wasn't able to load":(l="This page is now jQuerified with v"+jQuery.fn.jquery,a&&(l+=" and noConflict(). Use $jq(), not $().")),t()})}}();