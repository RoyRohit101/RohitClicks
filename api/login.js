const L=require('./_lib');
module.exports=async(req,res)=>{const e=String((req.body||{}).email||'').trim().toLowerCase();
if(req.method==='POST'&&e&&e===L.AE)await L.mail('Your admin login code','Your Rohit Clicks admin code: '+L.code(e,L.win())+'\n\nIt expires in about 10 minutes.');
res.json({ok:true})};
