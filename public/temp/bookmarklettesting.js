javascript:(function(){
  var socketxdm;
  if(typeof dropsphere === 'undefined' || dropsphere==false){
    dropsphere=true;
    var el=document.createElement('div'),
        b=document.getElementsByTagName('body')[0],
        msg='';
    
    var img=new Image();
    img.src='http://localhost:3500/img/close_hover.png';
    
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

    getScript('http://localhost:3500/easyxdm/easyxdm.debug.js', function(){
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
      background:url(http://localhost:3500/img/close.png) no-repeat;
      z-index:99999999;
      }
      #close:hover{
      background:url(http://localhost:3500/img/close_hover.png) no-repeat;
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
      document.addEventListener('dragend', function(event){
          console.log('drag');
          console.log(event.target.src);
          socketxdm.postMessage('imgDrop:' + event.target.src);
      }, false);
    }


    function getContentByMetaTagName(c){
        for (var b = document.getElementsByTagName('meta'), a = 0; a < b.length; a++){
          if (c == b[a].name || c == b[a].getAttribute('property')) { return b[a].content; }
        } return false;
    }

    function dropsphereXDM(){
          socketxdm = new easyXDM.Socket({
            remote: 'http://localhost:3500/bookmark/',
            container:'dropsphere',

            onMessage: function(message, origin){
              if(message == 'getURL'){
                  console.log('URL requested from ' + origin);
          
                  var url = document.URL;
                  var title = document.title; 
                  var image  = '';
                  var thumbnail = '';

                  var suffix = /[^.]+$/.exec(url);

                  if(suffix == 'jpg' || suffix == 'jpeg' || suffix == 'gif' || suffix == 'png'){
                     image = url;
                     title = ''; 
                  }

                  thumbnail = getContentByMetaTagName('og:image');

                  if(!thumbnail){
                     var imgs = document.images;
                     for(var i =0; i < imgs.length; i++){
                        img = imgs[i];
                        if(img.height > 40 && img.width > 40){
                            thumbnail = img.src;
                            break;
                        } 
                     }
                  }

                  var preview = '';
                  preview += 'url:' + url; 
                  preview += ',title:' + title;
                  preview += ',image:' + image;
                  preview += ',thumbnail:' + thumbnail;
                  socketxdm.postMessage(preview);

              }if(message == 'auth'){
                console.log('auth page loading..');
                location.href = 'http://localhost:3500/auth';
              }if(message == 'close'){
                  var ds=document.getElementById('dropsphere');
                  ds.parentNode.removeChild(ds);
                  dropsphere=false;
              }
          },
              onReady: function(){
                    socketxdm.postMessage('bookmarkletSuccess');
              }
          });
    }
  }
})();