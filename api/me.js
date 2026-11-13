const L=require('./_lib');module.exports=(req,res)=>res.json({admin:L.isAdmin(req)});
