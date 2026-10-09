const NR_GA4_MEASUREMENT_ID="G-6GFD4GM9YN";

window.nrTrack=(eventName,params={})=>{
  if(typeof window.gtag==="function"){
    window.gtag(eventName,params);
  }
};

if(/^G-[A-Z0-9]+$/i.test(NR_GA4_MEASUREMENT_ID)){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag("js",new Date());
  window.gtag("config",NR_GA4_MEASUREMENT_ID,{
    send_page_view:true,
    anonymize_ip:true
  });

  const ga=document.createElement("script");
  ga.async=true;
  ga.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(NR_GA4_MEASUREMENT_ID);
  document.head.appendChild(ga);
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("a").forEach(link=>{
    const href=link.getAttribute("href")||"";
    const trackable=
      link.classList.contains("button") ||
      link.classList.contains("nav-cta") ||
      /(?:join|travel|investment|talent|speakers)\.html/i.test(href);
    if(!trackable) return;
    link.addEventListener("click",()=>{
      window.nrTrack("cta_click",{
        link_text:(link.textContent||"").trim().slice(0,100),
        link_url:href.slice(0,250),
        page_path:window.location.pathname
      });
    });
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{const id=a.getAttribute("href");if(id==="#"||!document.querySelector(id))return;e.preventDefault();document.querySelector(id).scrollIntoView({behavior:"smooth"});}));
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#lead-interest-form");
  if(!form) return;
  const interestChecks=[...form.querySelectorAll('input[name="interest"]')];
  const multi=form.querySelector("#interest-multiselect");
  const toggle=multi?.querySelector(".interest-multiselect-toggle");
  const menu=multi?.querySelector(".interest-multiselect-menu");
  const label=multi?.querySelector("#interest-multiselect-label");
  const note=form.querySelector("#interest-selection-note");

  const selectedValues=()=>interestChecks.filter(i=>i.checked).map(i=>i.value);
  const syncInterestUI=()=>{
    const selected=selectedValues();
    form.querySelectorAll(".conditional-panel").forEach(panel=>{
      panel.classList.toggle("is-visible",selected.includes(panel.dataset.showFor));
    });
    if(label){
      label.textContent=selected.length===0
        ?"Choose your interests"
        :selected.length===1
          ?interestChecks.find(i=>i.checked)?.closest("label")?.querySelector("strong")?.textContent||"1 interest selected"
          :selected.length+" interests selected";
    }
    if(note){
      note.textContent=selected.length
        ?"You’ll receive updates for all "+selected.length+" selected interest"+(selected.length===1?"":"s")+"."
        :"Select at least one interest.";
      note.classList.toggle("is-success",selected.length>0);
    }
  };

  toggle?.addEventListener("click",()=>{
    const open=menu?.hasAttribute("hidden");
    if(open) menu?.removeAttribute("hidden"); else menu?.setAttribute("hidden","");
    toggle.setAttribute("aria-expanded",open?"true":"false");
  });
  interestChecks.forEach(i=>i.addEventListener("change",syncInterestUI));
  document.addEventListener("click",(e)=>{
    if(multi && !multi.contains(e.target)){
      menu?.setAttribute("hidden","");
      toggle?.setAttribute("aria-expanded","false");
    }
  });
  syncInterestUI();
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
    if(!interests.length){
      status.textContent="Choose at least one interest so we know what updates to send you.";
      status.classList.add("is-error");
      form.querySelector("#interest-multiselect")?.scrollIntoView({behavior:"smooth",block:"center"});
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

      window.nrTrack("generate_lead",{
        lead_type:"general",
        interests:interests.join(",").slice(0,200),
        page_path:window.location.pathname
      });

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
        window.nrTrack("generate_lead",{
          lead_type:String(payload.leadType||"special").slice(0,50),
          page_path:window.location.pathname
        });
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
  const form=document.querySelector("#lead-interest-form");
  if(!form) return;
  const params=new URLSearchParams(window.location.search);
  const interest=params.get("interest");
  if(!interest) return;
  const checkbox=form.querySelector('input[name="interest"][value="'+CSS.escape(interest)+'"]');
  if(checkbox){
    checkbox.checked=true;
    checkbox.dispatchEvent(new Event("change",{bubbles:true}));
    form.querySelector("#interest-multiselect")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
});
