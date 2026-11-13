const{put,list}=require('@vercel/blob');const L=require('./_lib');
module.exports=async(req,res)=>{
if(req.method==='POST'){if(!L.isAdmin(req))return res.status(401).end();
await put('site/content.json',JSON.stringify(req.body),{access:'public',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:0});return res.json({ok:true})}
const{blobs}=await list({prefix:'site/content.json'});res.setHeader('Cache-Control','no-store');
if(!blobs.length)return res.json({});res.json(await(await fetch(blobs[0].url+'?t='+Date.now())).json())};
