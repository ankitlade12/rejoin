export const live={available:false,session:null,events:null};
export async function api(path,data,method='POST',signal){
 const response=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':live.session?.csrf||''},...(data?{body:JSON.stringify(data)}:{}),signal});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');return result;
}
export async function connect(onRoom,onReady){
 try{const session=await api('/api/session',null,'GET');if(!session.csrf)return;live.available=true;live.session=session;onRoom(session.room);onReady();
  live.events=new EventSource('/api/events');live.events.onmessage=e=>{try{onRoom(JSON.parse(e.data));}catch{}};live.events.onerror=()=>onRoom(null);
 }catch{live.available=false;}
}
export async function refreshSession(){live.session=await api('/api/session',null,'GET');return live.session;}
