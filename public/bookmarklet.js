javascript:(function(){
if(typeof dropsphere === "undefined"){
	dropsphere=true;
	var d = document.createElement("div");
	d.setAttribute("id", "dropsphere");
	d.style.width = "300px";
	d.style.height = "100%";
	d.style.background="#f6f6f6";
	d.style.position = "fixed";
	d.style.top="0";
	d.style.right="0";
	d.style.zIndex="9999999";
	d.style.borderLeft="1px solid #ddd";
	document.body.appendChild(d);

	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = "#dropsphere
	{
		animation:slide .5s;
		-webkit-animation:slide .5s;
	}
	@keyframes slide
	{
	from {right:-300px;}
	to {right:0;}
	}
	@-webkit-keyframes slide
	{
	from {right:-300px;}
	to {right:0;}
	}
	";
	document.body.appendChild(css);
	ifrm = document.createElement("iframe");
	ifrm.setAttribute("src", "http://localhost:3500/bookmark");
	ifrm.style.width = "100%";
	ifrm.style.height = "100%";
	ifrm.style.overflow = "hidden";
	ifrm.style.border = "none";
	d.appendChild(ifrm); 
}
})();  


