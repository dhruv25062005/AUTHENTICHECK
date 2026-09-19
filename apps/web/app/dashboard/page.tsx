"use client";
import { useEffect,useState } from "react";
type Product={id:string;name:string;brand:string;category:string;instance_count:number;batch_count:number};
export default function Dashboard(){
 const[products,setProducts]=useState<Product[]>([]);const[loading,setLoading]=useState(true);const[token,setToken]=useState("");
 useEffect(()=>{const t=localStorage.getItem("authenti_token")||"";setToken(t);if(t)fetch("http://localhost:4000/api/v1/products",{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json()).then(x=>setProducts(x.products||[])).finally(()=>setLoading(false));else setLoading(false)},[]);
 if(!token)return <main className="page"><section className="hero"><div className="badge">MANUFACTURER DASHBOARD</div><h1>Sign in required.</h1><p>Authenticate as a manufacturer to manage registered products.</p></section></main>;
 return <main className="page"><section className="hero"><div className="badge">AUTHENTICHECK • MANUFACTURER</div><h1>Product dashboard.</h1><p>Manage registered products and serialized product inventory.</p><div className="dashboardGrid"><div className="stat"><strong>{products.length}</strong><span>Products</span></div><div className="stat"><strong>{products.reduce((n,p)=>n+p.batch_count,0)}</strong><span>Batches</span></div><div className="stat"><strong>{products.reduce((n,p)=>n+p.instance_count,0)}</strong><span>Serialized instances</span></div></div>{loading?<p>Loading…</p>:<div className="productList">{products.map(p=><article key={p.id}><h2>{p.name}</h2><p>{p.brand} · {p.category}</p><span>{p.batch_count} batches · {p.instance_count} instances</span></article>)}</div>}</section></main>
}
