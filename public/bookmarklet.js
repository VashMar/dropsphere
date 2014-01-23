javascript:(function(){
var d = document.createElement("div");
d.setAttribute("id", "dropsphere");
d.style.width = "300px";
d.style.height = "100%";
d.style.background = "#eee";
d.style.color = "#222";
d.style.position = "fixed";
d.style.top="0";
d.style.right="0";

ifrm = document.createElement("iframe");
ifrm.setAttribute("src", "http://localhost:3500/bookmark");
ifrm.style.width = "100%";
ifrm.style.height = "100%";
ifrm.style.overflow = "hidden";
ifrm.style.border = "none";
d.appendChild(ifrm); 
document.body.appendChild(d);

})();  


