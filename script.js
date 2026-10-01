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

  bindSpecialForm("#civic-interest-form","#civic-form-status",(form)=>({
    leadType:"civic",
    name:form.elements.name.value,
    email:form.elements.email.value,
    phone:form.elements.phone.value,
    city:form.elements.city.value,
    country:form.elements.country.value,
    civicInterests:[...form.querySelectorAll('input[name="civic_interest"]:checked')].map(i=>i.value),
    topicSuggestion:form.elements.topicSuggestion.value,
    interests:["Civic Engagement + Governance"],
    investmentInterests:[],travelInterests:[]
  }),"Thanks. You’re on the civic engagement update list.");
});
