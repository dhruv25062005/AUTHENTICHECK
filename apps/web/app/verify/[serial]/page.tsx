"use client";
import { useEffect,useState } from "react";
type Result={status:string;riskScore:number;product?:{name:string;brand:string;category:string;manufacturer:string;serialNumber:string};history?:{previousScans:number;recentScansLastHour:number};reasons:string[]};
export default function VerifyPage({params}:{params:Promise<{serial:string}>}){
 const[serial,setSerial]=useState("");const[result,setResult]=useState<Result|null>(null);const[loading,setLoading]=useState(true);
 useEffect(()=>{params.then(p=>{setSerial(p.serial);fetch(`http://localhost:4000/api/v1/verify/${encodeURIComponent(p.serial)}`).then(r=>r.json()).then(setResult).finally(()=>setLoading(false));});},[params]);
 if(loading)return <main className="page"><section className="hero"><h1>Verifying product…</h1></section></main>;
 return <main className="page"><section className="hero"><div className="badge">AUTHENTICHECK • VERIFICATION</div><h1>{result?.status==="GENUINE"?"Low Risk":result?.status==="SUSPICIOUS"?"Suspicious":"High Risk"}</h1><p>Serial: <strong>{serial}</strong></p>{result?.product&&<div className="resultBox"><h2>{result.product.name}</h2><p>{result.product.brand} · {result.product.category}</p><p>Manufacturer: {result.product.manufacturer}</p><p>Risk score: <strong>{result.riskScore}/100</strong></p><h3>Why?</h3>{result.reasons.map((x,i)=><p key={i}>• {x}</p>)}</div>}</section></main>;
}
