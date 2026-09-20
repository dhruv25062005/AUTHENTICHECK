"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, UserPlus, AlertCircle } from "lucide-react";

export default function Register() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [role,setRole]=useState<"CONSUMER"|"MANUFACTURER">("MANUFACTURER"); const [org,setOrg]=useState("");
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const router=useRouter();

  async function submit(e:React.FormEvent){
    e.preventDefault(); setError(""); setLoading(true);
    try{
      const res=await fetch("/api/v1/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:name,email,password,role,organizationName:role==="MANUFACTURER"?org:undefined})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Registration failed");
      localStorage.setItem("authenti_token",data.accessToken);
      localStorage.setItem("authenti_user",JSON.stringify(data.user));
      router.push(role==="MANUFACTURER"?"/dashboard":"/");
    }catch(err){setError(err instanceof Error?err.message:"Unable to create account");}
    finally{setLoading(false);}
  }

  return <main id="register-view" style={{maxWidth:"480px",margin:"40px auto",padding:"0 16px"}}>
    <section style={{background:"var(--bg-surface)",border:"1px solid var(--border-dim)",borderRadius:"16px",padding:"32px",boxShadow:"0 10px 30px rgba(0,0,0,.4)"}}>
      <div style={{textAlign:"center",marginBottom:"24px"}}><div className="badge-tag mb-2"><ShieldCheck className="w-4 h-4 text-sky-400"/><span>Secure Account Enrollment</span></div><h1 style={{fontSize:"26px",fontWeight:800,color:"#f8fafc",marginTop:"8px"}}>Create Your Account</h1><p style={{color:"#94a3b8",fontSize:"14px"}}>Register a manufacturer or consumer account.</p></div>
      {error&&<div style={{marginBottom:"16px",padding:"12px 14px",borderRadius:"8px",background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.35)",color:"#fca5a5",fontSize:"13px",display:"flex",gap:"8px"}}><AlertCircle className="w-4 h-4"/><span>{error}</span></div>}
      <form onSubmit={submit} className="app-form">
        <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} required/></div>
        <div className="form-group"><label className="form-label">Email Address</label><input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
        <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-input" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></div>
        <div className="form-group"><label className="form-label">Account Role</label><select className="form-select" value={role} onChange={e=>setRole(e.target.value as "CONSUMER"|"MANUFACTURER")}><option value="MANUFACTURER">Manufacturer</option><option value="CONSUMER">Consumer</option></select></div>
        {role==="MANUFACTURER"&&<div className="form-group"><label className="form-label">Organization / Brand Name</label><input className="form-input" value={org} onChange={e=>setOrg(e.target.value)} required/></div>}
        <button type="submit" disabled={loading} className="btn-accent" style={{width:"100%",justifyContent:"center",padding:"12px"}}><UserPlus className="w-4 h-4"/><span>{loading?"Creating account...":"Create Account"}</span></button>
      </form>
      <p style={{marginTop:"20px",textAlign:"center",fontSize:"13px",color:"#94a3b8"}}>Already registered? <Link href="/login" style={{color:"#38bdf8",fontWeight:600}}>Sign in</Link></p>
    </section>
  </main>;
}
