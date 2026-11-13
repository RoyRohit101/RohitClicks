const L=require('./_lib');
module.exports=async(req,res)=>{const{email='',code=''}=req.body||{},e=String(email).trim().toLowerCase(),k=String(code).trim();
if(e!==L.AE||![L.win(),L.win()-1].some(w=>L.code(e,w)===k))return res.status(401).json({ok:false});
res.setHeader('Set-Cookie','adm='+L.token()+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800');res.json({ok:true})};
