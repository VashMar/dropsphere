javascript:(function(){
  var socketxdm;
  if(typeof dropsphere === 'undefined' || dropsphere==false){
    dropsphere=true;
    var el=document.createElement('div'),
        b=document.getElementsByTagName('body')[0],
        msg='';
    
    var img=new Image();
    img.src='http://dropsphere.herokuapp.com/img/close_hover.png';
    
    function getScript(url,success){
      var script=document.createElement('script');
      script.src=url;
      var head=document.getElementsByTagName('head')[0],
          done=false;
      script.onload=script.onreadystatechange = function(){
        if ( !done && (!this.readyState
             || this.readyState == 'loaded'
             || this.readyState == 'complete') ) {
          done=true;
          success();
          script.onload = script.onreadystatechange = null;
          head.removeChild(script);
        }
      };
      (head || document.documentElement).appendChild(script);
    }

    getScript('http://dropsphere.herokuapp.com/easyxdm/easyxdm.debug.js', function(){
      dropsphereLaunch();
      dropsphereXDM();
    });

    function dropsphereLaunch(){
      dropsphere=true;
      var d = document.createElement('div');
      d.setAttribute('id', 'dropsphere');
      d.style.width = '300px';
      d.style.height = '100%';
      d.style.position = 'fixed';
      d.style.top='0';
      d.style.right='0';
      d.style.zIndex='9999999';
      d.style.borderLeft='1px solid #ddd';
      document.body.appendChild(d);
      var close = document.createElement('div');
      close.setAttribute('id', 'close');
      close.onclick = function() { 
                var ds=document.getElementById('dropsphere');
          ds.parentNode.removeChild(ds);
          dropsphere=false;
            };
      d.appendChild(close);

      var css = document.createElement('style');
      css.type = 'text/css';
      css.innerHTML = '#dropsphere
      {
        animation:slide .5s;
        -webkit-animation:slide .5s;
        background: #f6f6f6 no-repeat center center; 
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
      #close{
      cursor:pointer;
      position:absolute;
      top:0;
      right:0;
      margin:2px 6px 0 0;
      height:30px;
      width:30px;
      background:url(http://dropsphere.herokuapp.com/img/close.png) no-repeat;
      z-index:99999999;
      }
      #close:hover{
      background:url(http://dropsphere.herokuapp.com/img/close_hover.png) no-repeat;
      }
      #dropsphere{
         }
      #dropsphere iframe{
        border:none;
        height:100%;
      }
      #dropper{
        position:absolute;
        top:0;
         pointer-events:none;
      }
      ';
      document.body.appendChild(css);
    }

    function dropsphereXDM(){
          socketxdm = new easyXDM.Socket({
            remote: 'http://dropsphere.herokuapp.com/bookmark',
            container:'dropsphere',

            onMessage: function(message, origin){
              if(message == 'getURL'){
                  console.log('URL requested from ' + origin);
                  socketxdm.postMessage(document.URL);
              }
            },
            onReady : function() {
                    socketxdm.postMessage('xdm working in bookmarklet');
            }
          });
    }
  }
})();