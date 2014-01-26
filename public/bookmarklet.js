javascript:(function(){
if(typeof dropsphere === "undefined"){
	dropsphere=true;
	var d = document.createElement("div");
	d.setAttribute("id", "dropsphere");
	d.style.width = "300px";
	d.style.height = "100%";
	d.style.background="#eee no-repeat center center data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==";
	d.style.color = "#222";
	d.style.position = "fixed";
	d.style.top="0";
	d.style.right="0";
	d.style.zIndex="9999999";
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
	ifrm.setAttribute("src", "http://192.168.1.13:3500/bookmark");
	ifrm.style.width = "100%";
	ifrm.style.height = "100%";
	ifrm.style.overflow = "hidden";
	ifrm.style.border = "none";
	d.appendChild(ifrm); 
}
})();  


