export type RiskLabel="GENUINE"|"SUSPICIOUS"|"HIGH_RISK";
export interface RiskInput{identityValid:boolean;instanceActive:boolean;previousScans:number;recentScanVelocity:number;visualSimilarity?:number;visualAnomaly?:number;reportCount?:number}
export function assessRisk(i:RiskInput){
 let score=0;const reasons:string[]=[];
 if(!i.identityValid){score+=70;reasons.push("Product identity was not found.");}
 if(!i.instanceActive){score+=30;reasons.push("Product instance is blocked or retired.");}
 if(i.previousScans>=10){score+=Math.min(20,5+Math.floor(i.previousScans/5));reasons.push("Unusually high historical scan activity.");}
 if(i.recentScanVelocity>=5){score+=15;reasons.push("High recent scan velocity detected.");}
 if(i.visualSimilarity!==undefined&&i.visualSimilarity<.75){score+=20;reasons.push("Visual similarity is below the configured threshold.");}
 if(i.visualAnomaly!==undefined&&i.visualAnomaly>.5){score+=20;reasons.push("Visual anomaly signal is elevated.");}
 if((i.reportCount??0)>=3){score+=10;reasons.push("Multiple reports are associated with this product.");}
 score=Math.min(100,score);
 const label:RiskLabel=score>=70?"HIGH_RISK":score>=35?"SUSPICIOUS":"GENUINE";
 if(!reasons.length)reasons.push("No significant anomaly detected by the currently enabled signals.");
 return {score,label,reasons};
}
