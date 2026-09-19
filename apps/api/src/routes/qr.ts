import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { createVerificationQr } from "../utils/qr.js";

const router=Router();
router.get("/instance/:instanceId",requireAuth,requireRole("MANUFACTURER"),async(req:AuthenticatedRequest,res)=>{
 try{
  const r=await db.query(`SELECT pi.id,pi.serial_number FROM product_instances pi JOIN products p ON p.id=pi.product_id JOIN manufacturers m ON m.id=p.manufacturer_id WHERE pi.id=$1 AND m.user_id=$2 LIMIT 1`,[req.params.instanceId,req.user!.id]);
  if(!r.rows[0]){res.status(404).json({error:"Product instance not found"});return;}
  res.json({serialNumber:r.rows[0].serial_number,qrDataUrl:await createVerificationQr(r.rows[0].serial_number)});
 }catch(e){console.error(e);res.status(500).json({error:"Failed to generate QR"});}
});
export default router;
