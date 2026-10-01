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
      const card=form.closest(".lead-form-card");
      const progress=card?.querySelector(".form-progress");
      const success=card?.querySelector("#registration-success");
      if(progress) progress.hidden=true;
      form.hidden=true;
      if(success){
        success.hidden=false;
        success.scrollIntoView({behavior:"smooth",block:"center"});
      }
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
    websiteUrl:form.elements.websiteUrl ? form.elements.websiteUrl.value : "",
    instagram:form.elements.instagram ? form.elements.instagram.value : "",
    linkedin:form.elements.linkedin ? form.elements.linkedin.value : "",
    tiktok:form.elements.tiktok ? form.elements.tiktok.value : "",
    speakerTopics:[...form.querySelectorAll('input[name="speaker_topic"]:checked')].map(i=>i.value),
    proposedTopic:form.elements.proposedTopic.value,
    takeaway:form.elements.takeaway.value,
    bio:form.elements.bio.value,
    interests:["Speaker / Programming"],
    investmentInterests:[],travelInterests:[]
  }),"Thanks. Your speaker interest has been submitted for programming review.");

  bindSpecialForm("#investment-interest-form","#investment-form-status",(form)=>{
    const investmentInterests=[...form.querySelectorAll('input[name="investment_interest"]:checked')].map(i=>i.value);
    if(investmentInterests.length===0) throw new Error("Choose at least one investment interest.");
    return {
      leadType:"investment",
      name:form.elements.name.value,
      email:form.elements.email.value,
      phone:form.elements.phone.value,
      city:form.elements.city.value,
      state:form.elements.state ? form.elements.state.value : "",
      region:form.elements.region ? form.elements.region.value : "",
      country:form.elements.country.value,
      interests:["Investment"],
      investmentInterests,
      investmentRange:form.elements.investment_range ? form.elements.investment_range.value : "",
      travelInterests:[]
    };
  },"Thanks. You’re on the Nigerian Reunion investment interest list.");

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

  bindSpecialForm("#talent-interest-form","#talent-form-status",(form)=>{
    const talentTypes=[...form.querySelectorAll('input[name="talent_type"]:checked')].map(i=>i.value);
    if(talentTypes.length===0) throw new Error("Choose at least one talent type.");
    return {
      leadType:"talent",
      name:form.elements.name.value,
      email:form.elements.email.value,
      phone:form.elements.phone.value,
      city:form.elements.city.value,
      state:form.elements.state ? form.elements.state.value : "",
      region:form.elements.region ? form.elements.region.value : "",
      country:form.elements.country.value,
      stageName:form.elements.stageName.value,
      talentTypes,
      websiteUrl:form.elements.websiteUrl.value,
      instagram:form.elements.instagram.value,
      tiktok:form.elements.tiktok.value,
      performanceUrl:form.elements.performanceUrl.value,
      genre:form.elements.genre.value,
      audienceSize:form.elements.audienceSize.value,
      bookingInterest:[...form.querySelectorAll('input[name="booking_interest"]:checked')].map(i=>i.value),
      bio:form.elements.bio.value,
      whyReunion:form.elements.whyReunion.value,
      bookingContact:form.elements.bookingContact.value,
      interests:["Talent Interest"],
      investmentInterests:[],
      travelInterests:[]
    };
  },"Thanks. Your talent interest has been submitted for programming review.");

  bindSpecialForm("#faq-contact-form","#faq-contact-status",(form)=>({
    leadType:"inquiry",
    name:form.elements.name.value,
    email:form.elements.email.value,
    phone:form.elements.phone.value,
    subject:form.elements.subject.value,
    message:form.elements.message.value,
    city:"",
    state:"",
    region:"",
    country:"",
    interests:["General Inquiry"],
    investmentInterests:[],
    travelInterests:[]
  }),"Thanks. Your inquiry has been sent to the Nigerian Reunion team.");

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
      revueno.innerHTML='<img src="data:image/png;base64,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" alt="Revueno">';
      social.appendChild(revueno);
    }
  });
});

document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#lead-interest-form");
  if(!form) return;
  const params=new URLSearchParams(window.location.search);
  const interest=params.get("interest");
  if(!interest) return;
  const checkbox=form.querySelector('input[name="interest"][value="'+interest+'"]');
  if(checkbox){
    checkbox.checked=true;
    checkbox.dispatchEvent(new Event("change",{bubbles:true}));
    const card=checkbox.closest(".interest-card");
    if(card) card.scrollIntoView({behavior:"smooth",block:"center"});
  }
});
