export const salaryOptions=[
 {value:'ตามตกลง',en:'Negotiable'},
 {value:'ตามประสบการณ์',en:'Based on experience'},
 ...[[12000,14999],[15000,19999],[20000,24999],[25000,29999],[30000,34999],[35000,39999],[40000,44999],[45000,49999]].map(([from,to])=>{const range=`${from.toLocaleString('en-US')}–${to.toLocaleString('en-US')}`;return {value:range+' บาท',en:range+' THB'};}),
 {value:'50,000 บาทขึ้นไป',en:'50,000 THB and above'}
];
export function salaryLabel(value:string,language:'th'|'en'){return language==='en'?(salaryOptions.find(option=>option.value===value)?.en||value):value;}
