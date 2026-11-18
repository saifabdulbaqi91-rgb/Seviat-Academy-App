(function(){
  "use strict";
  function init(){
    const sidebar=document.getElementById("seviat-sidebar");
    if(!sidebar || document.getElementById("afaq-owner-audio-button")) return;
    const button=document.createElement("button");
    button.id="afaq-owner-audio-button";
    button.type="button";
    button.textContent="🎙️ إدارة آفاق | المكتبة الصوتية";
    Object.assign(button.style,{
      width:"100%",padding:"16px",marginTop:"12px",
      background:"#1769aa",color:"white",
      border:"0",borderRadius:"12px",
      fontSize:"16px",cursor:"pointer"
    });
    button.onclick=function(){return window.AfaqAdult.require(()=>{
      if(!window.AfaqAudioLibrary){
        alert("تعذر تحميل المكتبة الصوتية");
        return;
      }
      window.AfaqSmartAudioUI.open();

      document.getElementById("seviat-menu-close")?.click();
      });
    };
    sidebar.appendChild(button);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else init();
})();
