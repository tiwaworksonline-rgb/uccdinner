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
  "LEAD_TYPE","ORGANIZATION","ROLE_TITLE","PROFILE_URL","SPEAKER_TOPICS",
  "PROPOSED_TOPIC","AUDIENCE_TAKEAWAY","SPEAKER_BIO","CIVIC_INTERESTS","CIVIC_SUGGESTION"
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

      if(!name || !email || !phone || !city || !state || !country){
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
        PROFILE_URL:String(body.profileUrl||"").slice(0,200),
        SPEAKER_TOPICS:cleanList(body.speakerTopics),
        PROPOSED_TOPIC:String(body.proposedTopic||"").slice(0,200),
        AUDIENCE_TAKEAWAY:String(body.takeaway||"").slice(0,200),
        SPEAKER_BIO:String(body.bio||"").slice(0,200),
        CIVIC_INTERESTS:cleanList(body.civicInterests),
        CIVIC_SUGGESTION:String(body.topicSuggestion||"").slice(0,200)
      };

      let listIds=[];
      if(leadType==="travel"){
        listIds=[await ensureBrevoList("Nigerian Reunion Travel Interest")];
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
