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
    button.onclick=function(){
      if(!window.AfaqAudioLibrary){
        alert("تعذر تحميل المكتبة الصوتية");
        return;
      }
      const pin=localStorage.getItem("afaq-owner-audio-pin");
      if(!pin){
        const chosen=prompt("أنشئ رمز المدير المحلي (6 أرقام على الأقل):");
        if(chosen===null)return;
        if(!/^\d{6,}$/.test(chosen)){
          alert("الرمز يجب أن يحتوي على 6 أرقام على الأقل");
          return;
        }
        localStorage.setItem("afaq-owner-audio-pin",chosen);
      }else{
        const entered=prompt("أدخل رمز المدير لفتح المكتبة الصوتية:");
        if(entered!==pin)return alert("رمز غير صحيح");
      }
      window.AfaqSmartAudioUI.open();

      document.getElementById("seviat-menu-close")?.click();
    };
    sidebar.appendChild(button);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else init();
})();
