document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{const id=a.getAttribute("href");if(id==="#"||!document.querySelector(id))return;e.preventDefault();document.querySelector(id).scrollIntoView({behavior:"smooth"});}));
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#lead-interest-form");
  if(!form) return;
  const interestChecks=[...form.querySelectorAll('input[name="interest"]')];
  const syncPanels=()=>{
    const selected=new Set(interestChecks.filter(i=>i.checked).map(i=>i.value));
    document.querySelectorAll(".conditional-panel").forEach(panel=>{
      panel.classList.toggle("is-visible",selected.has(panel.dataset.showFor));
    });
  };
  interestChecks.forEach(i=>i.addEventListener("change",syncPanels));
  syncPanels();
});
