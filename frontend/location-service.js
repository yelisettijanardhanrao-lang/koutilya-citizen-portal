/* Koutilya Citizen Portal — shared location loader
   Handoff continuation. Do not duplicate AP District/Mandal/Village arrays
   inside individual services.
*/
(function(){
  'use strict';
  let cache = null;
  let pending = null;
  function parseCSV(text){
    const lines = String(text||'').split(/\r?\n/).filter(Boolean);
    if(!lines.length) return [];
    const parseLine = line => {
      const out=[]; let cur=''; let quoted=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){
          if(quoted && line[i+1]==='"'){cur+='"';i++;}
          else quoted=!quoted;
        }else if(ch===',' && !quoted){out.push(cur.trim());cur='';}
        else cur+=ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers=parseLine(lines[0]).map(x=>x.toLowerCase());
    return lines.slice(1).map(line=>{
      const vals=parseLine(line), row={};
      headers.forEach((h,i)=>row[h]=vals[i]??'');
      return row;
    });
  }
  async function load(){
    if(cache) return cache;
    if(pending) return pending;
    pending=fetch('/locations.csv',{cache:'no-store'})
      .then(r=>{if(!r.ok) throw new Error('Location data could not be loaded.'); return r.text();})
      .then(parseCSV)
      .then(rows=>{cache=rows; return rows;})
      .finally(()=>{pending=null;});
    return pending;
  }
  function first(row,names){
    for(const n of names){const k=n.toLowerCase(); if(row[k]) return row[k];}
    return '';
  }
  async function loadAPLocations(){
    const rows=await load();
    return rows.map(r=>({
      district:first(r,['district','district_name']),
      mandal:first(r,['mandal','mandal_name','mandalname']),
      village:first(r,['village','village_name','villagename']),
      raw:r
    })).filter(x=>x.district||x.mandal||x.village);
  }
  window.CSP_LOCATION_SERVICE={loadAPLocations,clearCache(){cache=null;}};
})();