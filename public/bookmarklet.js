javascript:(function(){
var d = document.createElement("div");
d.setAttribute('id', 'dropsphere');
d.style.width = "400px";
d.style.height = "100%";
d.style.background = "black";
d.style.color = "white";
d.style.position = "fixed";
d.style.top="0";
d.style.left="0";

d.innerHTML = '<iframe id="myFrame" style="width:100%;height:100%; overflow:hidden" src="http://localhost:3500/bookmark">';
document.body.appendChild(d);

})();  


