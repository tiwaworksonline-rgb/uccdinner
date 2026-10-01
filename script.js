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

document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#lead-interest-form");
  if(!form) return;
  const status=document.querySelector("#lead-form-status");
  const submit=form.querySelector(".lead-submit");

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    if(!form.reportValidity()) return;

    const interests=[...form.querySelectorAll('input[name="interest"]:checked')].map(i=>i.value);
    if(interests.length===0){
      status.textContent="Choose at least one interest so we know what to send you.";
      status.classList.add("is-error");
      return;
    }

    const payload={
      name:form.elements.name.value,
      email:form.elements.email.value,
      phone:form.elements.phone.value,
      city:form.elements.city.value,
      state:form.elements.state ? form.elements.state.value : "",
      region:form.elements.region ? form.elements.region.value : "",
      country:form.elements.country.value,
      website:form.elements.website ? form.elements.website.value : "",
      interests,
      investmentInterests:[...form.querySelectorAll('input[name="investment_interest"]:checked')].map(i=>i.value),
      investmentRange:form.elements.investment_range ? form.elements.investment_range.value : "",
      travelInterests:[...form.querySelectorAll('input[name="travel_interest"]:checked')].map(i=>i.value)
    };

    submit.disabled=true;
    submit.innerHTML='Joining…';
    status.textContent="Saving your information…";
    status.classList.remove("is-error","is-success");

    try{
      const response=await fetch("https://nigerian-reunion-brevo-api.onrender.com/api/leads",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || "Submission failed");

      form.reset();
      document.querySelectorAll(".conditional-panel").forEach(p=>p.classList.remove("is-visible"));
      status.textContent="You’re on the list. Watch your inbox for Nigerian Reunion Weekend updates.";
      status.classList.add("is-success");
      submit.innerHTML='You’re on the list ✓';
    }catch(err){
      status.textContent=err.message || "We couldn't save your information. Please try again.";
      status.classList.add("is-error");
      submit.disabled=false;
      submit.innerHTML='Join the Interest List <span>→</span>';
    }
  });
});

document.addEventListener("DOMContentLoaded",()=>{
  const bindSpecialForm=(formId,statusId,buildPayload,successMessage)=>{
    const form=document.querySelector(formId);
    if(!form) return;
    const status=document.querySelector(statusId);
    const submit=form.querySelector(".lead-submit");
    form.addEventListener("submit",async(e)=>{
      e.preventDefault();
      if(!form.reportValidity()) return;
      const original=submit.innerHTML;
      submit.disabled=true;
      submit.textContent="Submitting…";
      status.textContent="Saving your information…";
      status.classList.remove("is-error","is-success");
      try{
        const payload=buildPayload(form);
        const response=await fetch("https://nigerian-reunion-brevo-api.onrender.com/api/leads",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload)
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.error || "Submission failed");
        form.reset();
        status.textContent=successMessage;
        status.classList.add("is-success");
        submit.textContent="Submitted ✓";
      }catch(err){
        status.textContent=err.message || "We couldn't save your information. Please try again.";
        status.classList.add("is-error");
        submit.disabled=false;
        submit.innerHTML=original;
      }
    });
  };

  bindSpecialForm("#speaker-interest-form","#speaker-form-status",(form)=>({
    leadType:"speaker",
    name:form.elements.name.value,
    email:form.elements.email.value,
    phone:form.elements.phone.value,
    city:form.elements.city.value,
    state:form.elements.state ? form.elements.state.value : "",
    region:form.elements.region ? form.elements.region.value : "",
    country:form.elements.country.value,
    organization:form.elements.organization.value,
    role:form.elements.role.value,
    profileUrl:form.elements.profileUrl.value,
    speakerTopics:[...form.querySelectorAll('input[name="speaker_topic"]:checked')].map(i=>i.value),
    proposedTopic:form.elements.proposedTopic.value,
    takeaway:form.elements.takeaway.value,
    bio:form.elements.bio.value,
    interests:["Speaker / Programming"],
    investmentInterests:[],travelInterests:[]
  }),"Thanks. Your speaker interest has been submitted for programming review.");

  bindSpecialForm("#travel-interest-form","#travel-form-status",(form)=>{
    const travelInterests=[...form.querySelectorAll('input[name="travel_interest"]:checked')].map(i=>i.value);
    if(travelInterests.length===0) throw new Error("Choose at least one travel interest.");
    return {
      leadType:"travel",
      name:form.elements.name.value,
      email:form.elements.email.value,
      phone:form.elements.phone.value,
      city:form.elements.city.value,
      state:form.elements.state ? form.elements.state.value : "",
      region:form.elements.region ? form.elements.region.value : "",
      country:form.elements.country.value,
      interests:["Travel"],
      investmentInterests:[],
      investmentRange:"",
      travelInterests
    };
  },"Thanks. You’re on the Nigerian Reunion travel interest list.");

  bindSpecialForm("#civic-interest-form","#civic-form-status",(form)=>({
    leadType:"civic",
    name:form.elements.name.value,
    email:form.elements.email.value,
    phone:form.elements.phone.value,
    city:form.elements.city.value,
    state:form.elements.state ? form.elements.state.value : "",
    region:form.elements.region ? form.elements.region.value : "",
    country:form.elements.country.value,
    civicInterests:[...form.querySelectorAll('input[name="civic_interest"]:checked')].map(i=>i.value),
    topicSuggestion:form.elements.topicSuggestion.value,
    interests:["Civic Engagement + Governance"],
    investmentInterests:[],travelInterests:[]
  }),"Thanks. You’re on the civic engagement update list.");
});

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll('select[name="state"]').forEach(select=>{
    const form=select.closest("form");
    const regionField=form?.querySelector(".region-field");
    const regionInput=regionField?.querySelector('input[name="region"]');
    const sync=()=>{
      const outside=select.value==="OUTSIDE_US";
      if(regionField) regionField.hidden=!outside;
      if(regionInput) regionInput.required=outside;
      if(!outside && regionInput) regionInput.value="";
    };
    select.addEventListener("change",sync);
    sync();
  });
});

document.addEventListener("DOMContentLoaded",()=>{
  const header=document.querySelector(".site-header");
  const nav=header?.querySelector("nav");
  if(!header || !nav || header.querySelector(".mobile-nav-toggle")) return;
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="mobile-nav-toggle";
  btn.setAttribute("aria-label","Open navigation");
  btn.setAttribute("aria-expanded","false");
  btn.innerHTML="<span></span><span></span><span></span>";
  btn.addEventListener("click",()=>{
    const open=header.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded",String(open));
    btn.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  });
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
    header.classList.remove("nav-open");
    btn.setAttribute("aria-expanded","false");
    btn.setAttribute("aria-label","Open navigation");
  }));
  header.appendChild(btn);
});

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".site-footer").forEach(footer=>{
    let social=footer.querySelector(".social-links");
    if(!social){
      social=document.createElement("div");
      social.className="social-links site-social-links";
      social.setAttribute("aria-label","Social media");
      footer.insertBefore(social,footer.lastElementChild);
    }else{
      social.classList.add("site-social-links");
    }

    if(!social.querySelector('[data-social="instagram"]')){
      const instagram=document.createElement("span");
      instagram.className="social-icon";
      instagram.dataset.social="instagram";
      instagram.title="Instagram";
      instagram.setAttribute("aria-label","Instagram");
      instagram.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle></svg>';
      social.appendChild(instagram);
    }

    if(!social.querySelector('[data-social="tiktok"]')){
      const tiktok=document.createElement("span");
      tiktok.className="social-icon";
      tiktok.dataset.social="tiktok";
      tiktok.title="TikTok";
      tiktok.setAttribute("aria-label","TikTok");
      tiktok.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a4.2 4.2 0 1 1-3-4v2.8a1.7 1.7 0 1 0 1 1.55V4h2Zm0 0c.7 2.1 2 3.5 4 4v2.8c-1.6-.2-3-.8-4-1.7"></path></svg>';
      social.appendChild(tiktok);
    }

    if(!social.querySelector(".revueno-mark")){
      const revueno=document.createElement("span");
      revueno.className="revueno-mark";
      revueno.setAttribute("aria-label","Revueno");
      revueno.textContent="REVUENO";
      social.appendChild(revueno);
    }
  });
});
