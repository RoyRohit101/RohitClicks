const{put}=require('@vercel/blob');const L=require('./_lib');
module.exports=async(req,res)=>{if(req.method!=='POST'||!L.isAdmin(req))return res.status(401).end();
const n=String(req.headers['x-name']||'img.jpg').replace(/[^\w.-]/g,'_').slice(-60);
const b=await put('img/'+Date.now()+'-'+n,await L.raw(req),{access:'public',contentType:'image/jpeg'});res.json({url:b.url})};
