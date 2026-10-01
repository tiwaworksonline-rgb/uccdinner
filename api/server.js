const http = require("http");

const PORT = process.env.PORT || 10000;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const allowedOrigins = new Set([
  "https://nigerian-reunion-weekend-atlanta.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const attributeNames = [
  "FULL_NAME","PHONE_RAW","CITY_STATE","CITY","STATE","REGION","COUNTRY","NRW_INTERESTS",
  "INVEST_INTERESTS","INVEST_RANGE","TRAVEL_INTERESTS","SOURCE",
  "LEAD_TYPE","ORGANIZATION","ROLE_TITLE","PROFILE_URL","WEBSITE_URL","INSTAGRAM","LINKEDIN","TIKTOK","SPEAKER_TOPICS",
  "PROPOSED_TOPIC","AUDIENCE_TAKEAWAY","SPEAKER_BIO","CIVIC_INTERESTS","CIVIC_SUGGESTION",
  "STAGE_NAME","TALENT_TYPES","PERFORMANCE_URL","GENRE_STYLE","AUDIENCE_SIZE","BOOKING_INTEREST","WHY_REUNION","BOOKING_CONTACT",
  "INQUIRY_SUBJECT","INQUIRY_MESSAGE"
];

let attributesReady = false;
const listCache = new Map();

async function ensureBrevoList(listName){
  if(listCache.has(listName)) return listCache.get(listName);

  const listsData=await brevo("/contacts/lists?limit=50&offset=0",{method:"GET"});
  const existingList=(listsData.lists||[]).find(l=>l.name===listName);
  if(existingList){
    listCache.set(listName,existingList.id);
    return existingList.id;
  }

  const folderName="Nigerian Reunion";
  const foldersData=await brevo("/contacts/folders?limit=50&offset=0",{method:"GET"});
  let folder=(foldersData.folders||[]).find(f=>f.name===folderName);
  let folderId=folder?.id;
  if(!folderId){
    const createdFolder=await brevo("/contacts/folders",{
      method:"POST",
      body:JSON.stringify({name:folderName})
    });
    folderId=createdFolder.id;
  }

  const createdList=await brevo("/contacts/lists",{
    method:"POST",
    body:JSON.stringify({name:listName,folderId})
  });
  listCache.set(listName,createdList.id);
  return createdList.id;
}

function send(res,status,payload,origin){
  if(origin && allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function brevo(path, options={}){
  const r = await fetch("https://api.brevo.com/v3"+path,{
    ...options,
    headers:{
      "accept":"application/json",
      "content-type":"application/json",
      "api-key":BREVO_API_KEY,
      ...(options.headers||{})
    }
  });
  const text=await r.text();
  let body={};
  try{ body=text?JSON.parse(text):{}; }catch{ body={message:text}; }
  if(!r.ok) {
    const e=new Error(body.message || "Brevo request failed");
    e.status=r.status;
    e.details=body;
    throw e;
  }
  return body;
}

let notificationMetaCache=null;

async function getNotificationMeta(){
  if(notificationMetaCache) return notificationMetaCache;

  const [account,sendersData]=await Promise.all([
    brevo("/account",{method:"GET"}),
    brevo("/senders",{method:"GET"})
  ]);

  const recipient=String(account.email||"").trim();
  const senders=Array.isArray(sendersData.senders)?sendersData.senders:[];
  const sender=senders.find(s=>s.active!==false && s.email) || senders.find(s=>s.email);

  if(!recipient || !sender?.email) throw new Error("Notification recipient or sender is unavailable.");

  notificationMetaCache={
    recipient,
    sender:{name:sender.name||"Nigerian Reunion",email:sender.email}
  };
  return notificationMetaCache;
}

function htmlEscape(value){
  return String(value||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function leadLabel(leadType,body){
  if(leadType==="talent") return "Talent Interest";
  if(leadType==="speaker") return "Speaker Interest";
  if(leadType==="travel") return "Travel Interest";
  if(leadType==="inquiry") return "General Inquiry";
  if(leadType==="civic") return "Civic Interest";
  const interests=Array.isArray(body.interests)?body.interests.filter(Boolean):[];
  return interests.length?interests.join(" + "):"General Registration";
}

async function sendLeadNotification({leadType,name,email,phone,city,state,region,country,body}){
  const meta=await getNotificationMeta();
  const label=leadLabel(leadType,body);
  const location=[city,state==="OUTSIDE_US"?region:state,country].filter(Boolean).join(", ");
  const rows=[
    ["Name",name],
    ["Email",email],
    ["Phone",phone],
    ["Location",location],
    ["Type",label],
    ["Interests",cleanList(body.interests)],
    ["Investment interests",cleanList(body.investmentInterests)],
    ["Investment range",body.investmentRange],
    ["Travel interests",cleanList(body.travelInterests)],
    ["Talent type",cleanList(body.talentTypes)],
    ["Stage / Artist name",body.stageName],
    ["Genre / Style",body.genre],
    ["Booking interest",cleanList(body.bookingInterest)],
    ["Website",body.websiteUrl],
    ["Instagram",body.instagram],
    ["LinkedIn",body.linkedin],
    ["TikTok",body.tiktok],
    ["Performance link",body.performanceUrl],
    ["Organization",body.organization],
    ["Role / Title",body.role],
    ["Speaker topics",cleanList(body.speakerTopics)],
    ["Proposed topic",body.proposedTopic],
    ["Subject",body.subject],
    ["Inquiry",body.message]
  ].filter(([,v])=>String(v||"").trim());

  const rowHtml=rows.map(([k,v])=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #e7e7e7;font-weight:700;vertical-align:top;">${htmlEscape(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #e7e7e7;">${htmlEscape(v)}</td></tr>`).join("");

  await brevo("/smtp/email",{
    method:"POST",
    body:JSON.stringify({
      sender:meta.sender,
      to:[{email:meta.recipient}],
      replyTo:email?{email,name}:undefined,
      subject:`New Nigerian Reunion Registration — ${name} — ${label}`,
      htmlContent:`<div style="font-family:Arial,sans-serif;color:#07150f;max-width:720px;margin:auto">
        <h2 style="margin-bottom:6px">New Nigerian Reunion submission</h2>
        <p style="color:#56635d;margin-top:0">${htmlEscape(label)}</p>
        <table style="width:100%;border-collapse:collapse">${rowHtml}</table>
      </div>`
    })
  });
}

async function ensureAttributes(){
  if(attributesReady) return;
  const data=await brevo("/contacts/attributes",{method:"GET"});
  const existing=new Set((data.attributes||[]).map(a=>a.name));
  for(const name of attributeNames){
    if(existing.has(name)) continue;
    try{
      await brevo("/contacts/attributes/normal/"+encodeURIComponent(name),{
        method:"POST",
        body:JSON.stringify({type:"text"})
      });
    }catch(err){
      // Ignore an already-exists race; surface other failures.
      if(err.status !== 400) throw err;
    }
  }
  attributesReady=true;
}

function cleanList(v){
  if(!Array.isArray(v)) return "";
  return v.map(x=>String(x).trim()).filter(Boolean).join(", ").slice(0,200);
}

const server=http.createServer(async (req,res)=>{
  const origin=req.headers.origin;

  if(req.method==="OPTIONS"){
    if(origin && allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin",origin);
    res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    res.statusCode=204;
    return res.end();
  }

  if(req.method==="GET" && req.url==="/health"){
    return send(res,200,{ok:true,brevoConfigured:Boolean(BREVO_API_KEY)},origin);
  }

  if(req.method!=="POST" || req.url!=="/api/leads"){
    return send(res,404,{ok:false,error:"Not found"},origin);
  }

  if(origin && !allowedOrigins.has(origin)){
    return send(res,403,{ok:false,error:"Origin not allowed"},origin);
  }

  if(!BREVO_API_KEY){
    return send(res,503,{ok:false,error:"Lead service is not configured yet."},origin);
  }

  let raw="";
  req.on("data",chunk=>{
    raw+=chunk;
    if(raw.length>100000) req.destroy();
  });
  req.on("end",async()=>{
    try{
      const body=JSON.parse(raw||"{}");
      if(body.website) return send(res,200,{ok:true},origin);

      const name=String(body.name||"").trim();
      const email=String(body.email||"").trim().toLowerCase();
      const phone=String(body.phone||"").trim();
      const city=String(body.city||"").trim();
      const state=String(body.state||"").trim();
      const region=String(body.region||"").trim();
      const country=String(body.country||"").trim();
      const leadType=String(body.leadType||"general").trim();

      const inquiryMessage=String(body.message||"").trim();
      if(leadType==="inquiry"){
        if(!name || !email || !String(body.subject||"").trim() || !inquiryMessage){
          return send(res,400,{ok:false,error:"Please complete all required fields."},origin);
        }
      } else if(!name || !email || !phone || !city || !state || !country){
        return send(res,400,{ok:false,error:"Please complete all required fields."},origin);
      }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        return send(res,400,{ok:false,error:"Please enter a valid email address."},origin);
      }

      await ensureAttributes();

      const attributes={
        FULL_NAME:name.slice(0,200),
        PHONE_RAW:phone.slice(0,200),
        CITY_STATE:(state==="OUTSIDE_US" ? [city,region].filter(Boolean).join(", ") : [city,state].filter(Boolean).join(", ")).slice(0,200),
        CITY:city.slice(0,200),
        STATE:state.slice(0,200),
        REGION:region.slice(0,200),
        COUNTRY:country.slice(0,200),
        NRW_INTERESTS:cleanList(body.interests),
        INVEST_INTERESTS:cleanList(body.investmentInterests),
        INVEST_RANGE:String(body.investmentRange||"").slice(0,200),
        TRAVEL_INTERESTS:cleanList(body.travelInterests),
        SOURCE:"NRW Website",
        LEAD_TYPE:leadType.slice(0,200),
        ORGANIZATION:String(body.organization||"").slice(0,200),
        ROLE_TITLE:String(body.role||"").slice(0,200),
        PROFILE_URL:String(body.linkedin||body.websiteUrl||"").slice(0,200),
        WEBSITE_URL:String(body.websiteUrl||"").slice(0,200),
        INSTAGRAM:String(body.instagram||"").slice(0,200),
        LINKEDIN:String(body.linkedin||"").slice(0,200),
        TIKTOK:String(body.tiktok||"").slice(0,200),
        SPEAKER_TOPICS:cleanList(body.speakerTopics),
        PROPOSED_TOPIC:String(body.proposedTopic||"").slice(0,200),
        AUDIENCE_TAKEAWAY:String(body.takeaway||"").slice(0,200),
        SPEAKER_BIO:String(body.bio||"").slice(0,200),
        CIVIC_INTERESTS:cleanList(body.civicInterests),
        CIVIC_SUGGESTION:String(body.topicSuggestion||"").slice(0,200),
        STAGE_NAME:String(body.stageName||"").slice(0,200),
        TALENT_TYPES:cleanList(body.talentTypes),
        PERFORMANCE_URL:String(body.performanceUrl||"").slice(0,200),
        GENRE_STYLE:String(body.genre||"").slice(0,200),
        AUDIENCE_SIZE:String(body.audienceSize||"").slice(0,200),
        BOOKING_INTEREST:cleanList(body.bookingInterest),
        WHY_REUNION:String(body.whyReunion||"").slice(0,500),
        BOOKING_CONTACT:String(body.bookingContact||"").slice(0,200),
        INQUIRY_SUBJECT:String(body.subject||"").slice(0,200),
        INQUIRY_MESSAGE:inquiryMessage.slice(0,1000)
      };

      let listIds=[];
      if(leadType==="travel"){
        listIds=[await ensureBrevoList("Nigerian Reunion Travel Interest")];
      } else if(leadType==="talent"){
        listIds=[await ensureBrevoList("Nigerian Reunion Talent Interest")];
      } else if(leadType==="inquiry"){
        listIds=[await ensureBrevoList("Nigerian Reunion General Inquiries")];
      }

      await brevo("/contacts",{
        method:"POST",
        body:JSON.stringify({
          email,
          attributes,
          listIds,
          updateEnabled:true
        })
      });

      try{
        await sendLeadNotification({leadType,name,email,phone,city,state,region,country,body});
        console.log("NRW_NOTIFICATION_SENT",leadType,email);
      }catch(notificationErr){
        console.error("NRW_NOTIFICATION_FAILED",notificationErr.status||"",notificationErr.details||notificationErr.message);
      }

      return send(res,200,{ok:true,message:"You're on the list."},origin);
    }catch(err){
      console.error("Lead submission error",err.status||"",err.details||err.message);
      return send(res,500,{ok:false,error:"We couldn't save your information. Please try again."},origin);
    }
  });
});

server.listen(PORT,async()=>{
  console.log("NRW Brevo lead API listening on",PORT);
  if(!BREVO_API_KEY){
    console.error("BREVO_CONNECTION_MISSING");
    return;
  }
  try{
    await brevo("/account",{method:"GET"});
    console.log("BREVO_CONNECTION_OK");
  }catch(err){
    console.error("BREVO_CONNECTION_FAILED",err.status||"",err.details?.message||err.message);
  }
});
