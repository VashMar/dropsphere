function launchBookmark(inviteURL){
  if(typeof dropsphere === 'undefined' || dropsphere==false){
    dropsphere=true;
      var el=document.createElement('div'),
          b=document.getElementsByTagName('body')[0],
          otherlib=false,
          msg='';
      el.style.position='fixed';
      el.style.height='32px';
      el.style.width='220px';
      el.style.marginLeft='-110px';
      el.style.top='0';
      el.style.left='50%';
      el.style.padding='5px 10px';
      el.style.zIndex = 1001;
      el.style.fontSize='12px';
      el.style.color='#222';
      el.style.backgroundColor='#f99';
     
      if(typeof jQuery!='undefined') {
        msg='This page already using jQuery v'+jQuery.fn.jquery;
      } else if (typeof $=='function') {
        otherlib=true;
      }
      

      function getScript(url,success){
        var script=document.createElement('script');
        script.src=url;
        var head=document.getElementsByTagName('head')[0],
            done=false;
        script.onload=script.onreadystatechange = function(){
          if( !done && (!this.readyState
               || this.readyState == 'loaded'
               || this.readyState == 'complete') ) {
            done=true;
            success();
            script.onload = script.onreadystatechange = null;
            head.removeChild(script);
          }
        };
        head.appendChild(script);
      }

      getScript('https://code.jquery.com/jquery.min.js',function() {
        if (typeof jQuery=='undefined') {
          msg='Sorry, but jQuery wasn\'t able to load';
        } else {
          msg='This page is now jQuerified with v' + jQuery.fn.jquery;
          if (otherlib) {msg+=' and noConflict(). Use $jq(), not $().';}
        }
        uiLoader();

      });

      function uiLoader(){
        getScript('https://code.jquery.com/ui/1.10.4/jquery-ui.js',function(){
          if (typeof jQuery=='undefined') {
            msg='Sorry, but jQuery wasn\'t able to load';
          } else {
            msg='This page is now jQuerified with UI' + jQuery.fn.jquery;
            if (otherlib) {msg+=' and noConflict(). Use $jq(), not $().';}
          }
          getScript('https://www.dropsphere.com/easyxdm/easyxdm.debug.js', function(){
            console.log('xdm loaded');
            book();
            book2();
            console.log('bookmarklet loaded');
          });
          return showMsg();
        });
      }

      function testMsg(){
        targetWindow.postMessage('Hello World!', 'https://www.dropsphere.com');
      }
      
      function showMsg(){
        el.innerHTML=msg;
        b.appendChild(el);
        window.setTimeout(function() {
          if (typeof jQuery=='undefined') {
            b.removeChild(el);
          } else {
            jQuery(el).fadeOut('slow',function() {
              jQuery(this).remove();
            });
            if (otherlib) {
              $jq=jQuery.noConflict();
            }
          }
        } ,2500);
      }





    function book(){
      dropsphere=true;
      var d = document.createElement('div');
      d.setAttribute('id', 'dropsphere');
      d.style.width = '300px';
      d.style.height = '100%';
      d.style.background='#f6f6f6';
      d.style.position = 'fixed';
      d.style.top='0';
      d.style.right='0';
      d.style.zIndex='2147483647';
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

      var dropper = document.createElement('div');
      dropper.setAttribute('id', 'dropper');
      dropper.style.width = '300px';
      dropper.style.height = '100%';
      d.appendChild(dropper);

      var css = document.createElement('style');
      css.type = 'text/css';
      css.innerHTML = "#dropsphere{animation:slide .5s; -webkit-animation:slide .5s;}@keyframes slide{from{right:-300px;}to{right:0;}}@-webkit-keyframes slide{from{right:-300px;}to{right:0;}}#close{cursor:pointer; position:absolute; top:0; right:0; margin:2px 6px 0 0; height:30px; width:30px; background:url(https://dropsphere.herokuapp.com/img/close.png) no-repeat;}#close:hover{background:url(https://www.dropsphere.com/img/close_hover.png) no-repeat;}#dropsphere iframe{border:none; height:100%;}#dropper{position:absolute; top:0; pointer-events:none;}";
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

    function book2(){
            socketxdm = new easyXDM.Socket({
            remote: inviteURL,
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
                location.href = 'https://www.dropsphere.com/auth';
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
    
    function draggify(){
      $('p, a, h1, h2, h3, h4').draggable({
          stack: 'div',
          zIndex:99999999,
          start: function() {
            $(this).height(100).width(100);   
          },
      });
      $( '#dropper' ).droppable({
        drop: function( event, ui ) {
        $( this )
        .addClass( 'ui-state-highlight' )
        .find( 'p' )
        .html( 'Dropped!' );
        }
      });
    }
  }
}