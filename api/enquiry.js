const L=require('./_lib');
module.exports=async(req,res)=>{const v=req.body||{};if(req.method!=='POST'||!v.n||!v.e)return res.status(400).end();
const t=['n','e','p','t','d','s','l','b','m'].map(k=>k+': '+String(v[k]||'').slice(0,1500)).join('\n');
const r=await L.mail('New enquiry: '+String(v.t||'').slice(0,60),t,String(v.e).slice(0,120));res.status(r.ok?200:502).json({ok:r.ok})};
