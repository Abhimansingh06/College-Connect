// Read-only MCP bridge for College Connect's shared community data.
// Uses MCP's stdio JSON-RPC transport; stdout is reserved for protocol frames.
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const DATA_FILE = path.join(__dirname, 'data', 'community.json');
const TOOL_DEFS = [
  { name:'search_verified_mentors', description:'Search verified, available College Connect senior and alumni mentors. Use this for mentor discovery; results omit private contact details.', inputSchema:{type:'object',properties:{query:{type:'string',description:'Optional search across name, skills, expertise, department, and experience.'},role:{type:'string',enum:['all','senior','alumni'],description:'Optional member role filter.'}},additionalProperties:false} },
  { name:'search_opportunities', description:'Search internship, job, project, resource, and experience opportunities shared with College Connect.', inputSchema:{type:'object',properties:{query:{type:'string',description:'Optional search terms.'},type:{type:'string',enum:['all','Internship','Full-time','Project','Resource','Experience'],description:'Optional opportunity type.'}},additionalProperties:false} },
  { name:'browse_discussions', description:'Browse junior questions and the guidance replies shared by seniors and alumni.', inputSchema:{type:'object',properties:{category:{type:'string',description:'Optional topic such as Academics, Projects, Internships, Careers, Placements, or Higher studies.'},query:{type:'string',description:'Optional search in question titles and content.'}},additionalProperties:false} },
  { name:'get_community_overview', description:'Get aggregate College Connect counts for verified mentors, discussions, replies, and opportunities.', inputSchema:{type:'object',properties:{},additionalProperties:false} }
];

const sample = {
  mentors:[
    {id:'m-1',name:'Riya Sharma',role:'senior',year:'Year 4',department:'Computer Science',headline:'Frontend engineer in the making · Open source enthusiast',skills:['React','UI design','Portfolio'],topics:['Portfolio reviews','Frontend interviews','React'],available:true,verified:true},
    {id:'m-2',name:'Arjun Nair',role:'alumni',year:'Class of 2023',department:'Computer Science',headline:'Software engineer · Building for teams',skills:['System design','Java','Interviews'],topics:['Interview prep','Backend engineering','Career paths'],available:true,verified:true},
    {id:'m-3',name:'Meera Iyer',role:'senior',year:'Year 4',department:'Electronics',headline:'Embedded systems, robotics & curious side projects',skills:['Embedded C','IoT','Robotics'],topics:['Final year projects','Research','Electronics'],available:true,verified:true},
    {id:'m-4',name:'Kabir Das',role:'alumni',year:'Class of 2022',department:'Business',headline:'Product manager · Turning messy problems into clear plans',skills:['Product','Strategy','Startups'],topics:['Product thinking','Case interviews','Career paths'],available:true,verified:true},
    {id:'m-6',name:'Neel Patnaik',role:'alumni',year:'Class of 2021',department:'Mechanical',headline:'Design engineer · Mentoring early career designers',skills:['CAD','Design','Manufacturing'],topics:['Design projects','Career planning','Internships'],available:true,verified:true}
  ],
  opportunities:[
    {id:'o-1',type:'Internship',title:'Product design intern',company:'Mosaic Labs',location:'Bengaluru · Hybrid',postedBy:'Riya Sharma',description:'Join a product team and help shape thoughtful experiences.',tags:['UI/UX','Figma','Portfolio']},
    {id:'o-2',type:'Internship',title:'Software engineering intern',company:'Northstar Systems',location:'Remote · India',postedBy:'Arjun Nair',description:'Work with product engineers on collaborative software.',tags:['React','JavaScript','Git']},
    {id:'o-4',type:'Full-time',title:'Graduate software engineer',company:'Atlassian',location:'Bengaluru · Hybrid',postedBy:'Arjun Nair',description:'A graduate role for collaborative, curious engineers.',tags:['Engineering','Graduates','Java']}
  ],
  posts:[
    {id:'p-1',author:'Isha Mohanty',role:'senior',category:'Projects',time:'Recently',title:'What made your final year project stand out in interviews?',body:'I’m starting to plan my capstone and want to build something practical.',answers:[{author:'Riya Sharma',body:'A clear problem statement and a live demo helped me more than extra features.'}]},
    {id:'p-2',author:'Tara Sen',role:'junior',category:'Careers',time:'Recently',title:'How do you find the right first internship?',body:'There are so many listings and I’m not sure what to focus on.',answers:[{author:'Kabir Das',body:'Pick two or three things you want to practice, then look for roles where you’ll do them.'}]}
  ],verifiedIds:['m-1','m-2','m-3','m-4','m-6']
};

async function community(){let saved=null,users={};try{saved=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));}catch{}try{users=JSON.parse(await fs.readFile(path.join(__dirname,'data','users.json'),'utf8'));}catch{}const state=saved||{...sample};state.mentors=[...(state.mentors||[])];for(const member of Object.values(users)){if(member.active===false||!member.verified||!['senior','alumni'].includes(member.role)||!member.profile)continue;const person={id:member.id,...member.profile,verified:true,available:Boolean(member.profile.available)},index=state.mentors.findIndex(m=>m.id===person.id);if(index<0)state.mentors.push(person);else state.mentors[index]=person;state.verifiedIds=state.verifiedIds||[];if(!state.verifiedIds.includes(person.id))state.verifiedIds.push(person.id);}return state;}
function sourceData(saved){if(!saved)return sample;const verified=new Set(saved.verifiedIds||[]);return{...saved,mentors:(saved.mentors||[]).filter(m=>verified.has(m.id)&&m.verified!==false&&m.available),opportunities:saved.opportunities||[],posts:saved.posts||[]};}
const cleanMentor=m=>({id:m.id,name:m.name,role:m.role,year:m.year,department:m.department,headline:m.headline,skills:m.skills||[],topics:m.topics||[],experience:m.experience||'',cgpa:m.cgpa||'',domains:m.domains||[],organization:m.organization||'',jobTitle:m.jobTitle||'',industry:m.industry||''});
const tools={
  search_verified_mentors:async(args)=>{const data=sourceData(await community()),query=String(args.query||'').trim().toLowerCase(),role=args.role||'all';return data.mentors.filter(m=>(role==='all'||m.role===role)&&`${m.name} ${m.department} ${m.headline||''} ${(m.skills||[]).join(' ')} ${(m.topics||[]).join(' ')} ${(m.domains||[]).join(' ')} ${m.experience||''}`.toLowerCase().includes(query)).map(cleanMentor);},
  search_opportunities:async(args)=>{const data=sourceData(await community()),query=String(args.query||'').trim().toLowerCase(),type=args.type||'all';return data.opportunities.filter(o=>(type==='all'||o.type===type)&&`${o.title} ${o.company} ${o.description} ${o.location} ${(o.tags||[]).join(' ')}`.toLowerCase().includes(query));},
  browse_discussions:async(args)=>{const data=sourceData(await community()),query=String(args.query||'').trim().toLowerCase(),category=String(args.category||'').trim().toLowerCase();return data.posts.filter(p=>(!category||p.category.toLowerCase()===category)&&`${p.title} ${p.body} ${(p.answers||[]).map(a=>a.body).join(' ')}`.toLowerCase().includes(query)).map(p=>({id:p.id,author:p.author,role:p.role,category:p.category,title:p.title,body:p.body,answers:p.answers||[]}));},
  get_community_overview:async()=>{const data=sourceData(await community());return{verifiedAvailableMentors:data.mentors.length,discussions:data.posts.length,replies:data.posts.reduce((n,p)=>n+(p.answers||[]).length,0),opportunities:data.opportunities.length};}
};

function respond(id,result){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');}
function fail(id,code,message){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}})+'\n');}
async function handle(message){const{id,method,params={}}=message||{};if(typeof method!=='string')return;
  if(method==='initialize'){const requested=params.protocolVersion||'2025-11-25';const supported=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];respond(id,{protocolVersion:supported.includes(requested)?requested:'2025-11-25',capabilities:{tools:{listChanged:false}},serverInfo:{name:'college-connect',version:'1.0.0'},instructions:'Read-only access to verified College Connect mentors, shared opportunities, community questions, and aggregate overview. Private contact details are excluded.'});return;}
  if(method==='notifications/initialized'||method==='notifications/cancelled')return;
  if(method==='ping'){respond(id,{});return;}
  if(method==='tools/list'){respond(id,{tools:TOOL_DEFS});return;}
  if(method==='tools/call'){const name=params.name,handler=tools[name];if(!handler){respond(id,{content:[{type:'text',text:`Unknown College Connect tool: ${String(name)}`}],isError:true});return;}try{const result=await handler(params.arguments||{});respond(id,{content:[{type:'text',text:JSON.stringify(result,null,2)}]});}catch(error){respond(id,{content:[{type:'text',text:error.message||'Tool call failed.'}],isError:true});}return;}
  if(method==='resources/list'){respond(id,{resources:[]});return;}
  if(id!==undefined)fail(id,-32601,`Method not found: ${method}`);
}

const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{if(!line.trim())return;try{const message=JSON.parse(line);Promise.resolve(handle(message)).catch(error=>{if(message.id!==undefined)fail(message.id,-32603,error.message||'Internal error.');});}catch{process.stderr.write('Ignored malformed MCP JSON-RPC input.\n');}});
