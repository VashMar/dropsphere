javascript:(function() {
  var socketxdm;
  if(typeof dropsphere === 'undefined' || dropsphere==false){
    dropsphere=true;
    var el=document.createElement('div'),
        b=document.getElementsByTagName('body')[0],
        otherlib=false,
        msg='';

    var img=new Image();
    img.src='http://localhost:3500/img/close_hover.png';

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
        if ( !done && (!this.readyState
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
    getScript('http://code.jquery.com/jquery.min.js',function() {
      if (typeof jQuery=='undefined') {
        msg='Sorry, but jQuery wasnt able to load';
      } else {
        msg='This page is now jQuerified with v' + jQuery.fn.jquery;
        if (otherlib) {msg+=' and noConflict(). Use $jq(), not $().';}
      }
      uiLoader();

    });

    function uiLoader(){
      getScript('http://code.jquery.com/ui/1.10.4/jquery-ui.js',function() {
        if (typeof jQuery=='undefined') {
          msg='Sorry, but jQuery wasnt able to load';
        } else {
          msg='This page is now jQuerified with UI' + jQuery.fn.jquery;
          if (otherlib) {msg+=' and noConflict(). Use $jq(), not $().';}
        }
        getScript('http://localhost:3500/easyxdm/easyxdm.debug.js', function(){
          console.log('xdm loaded');
          dropsphereLaunch();
          dropsphereXDM();
          console.log('bookmarklet loaded');
        });
        return showMsg();

      });
    }
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

      var dropper = document.createElement('div');
      dropper.setAttribute('id', 'dropper');
      dropper.style.width = '300px';
      dropper.style.height = '100%';
      d.appendChild(dropper);

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
    }

    function dropsphereXDM(){
          socketxdm = new easyXDM.Socket({
            remote: 'http://localhost:3500/bookmark',
            container:'dropsphere',

            onMessage: function(message, origin){
                if(message=='#ds-img'){
                  draggify('img');
                }else if(message=='#ds-text'){
                  draggify('text');
                }else if(message=='#ds-link'){
                }
            },
            onReady : function() {

                    socketxdm.postMessage('Yay, it works!');
            }
          });
    }
    function draggify(selector){
      alert('drag called');
      if(selector == 'text'){
        selector = 'p, a, h1, h2, h3, h4';
      }else if(selector == 'img'){
        selector = 'img';
      }else{
      }
      $(selector).draggable({
          stack: 'div',
          zIndex:99999999,
          cursor: 'move', 
          cursorAt: { top: 56, left: 56 },
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

        socketxdm.postMessage(ui.draggable.html());
        }
      });
    }
    function imgParse(img){
      return img.find('img').attr('src');
    }
  }
})();