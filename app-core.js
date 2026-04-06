/* ===== app-core.js — ZenPrep AI Core Logic ===== */
/* Constants, State, Presets, Question Bank, Helpers, API */

const PROXY_API="/api/chat",AUTH_API="/api/auth",PROFILE_API="/api/profile",ADMIN_API="/api/admin";
const ACCESS_KEY="zenprep-access-code",PASS_KEY="zenprep-password",NAME_KEY="zenprep-learner-name",EXAM_KEY="zenprep-selected-exams",MODE_KEY="zenprep-provider-mode",RUNTIME_KEY="zenprep-runtime-mode",CLAUDE_KEY="zenprep-anthropic-key",GEMMA_KEY="zenprep-openrouter-key";
const DISPLAY_MODEL="Claude Sonnet 4 + Gemma 3 27B";
const CLAUDE_MODEL="claude-sonnet-4-20250514",CLAUDE_API_URL="https://api.anthropic.com/v1/messages";
const GEMMA_MODEL="google/gemma-3-27b-it:free",GEMMA_API_URL="https://openrouter.ai/api/v1/chat/completions";
const STEPS=["Verifying credentials","Detecting exam structure","Mapping syllabus","Calibrating difficulty","Preparing AI tutor","Unlocking dashboard"];
const TABS=[["overview","Overview"],["practice","Practice"],["teach","Teach Me"],["doubt","Ask Doubt"],["progress","Progress"],["mock","Mock Test"]];

/* ===== STATE ===== */
const C={};let nt=0,lt=0,mt=0,syncTimer=0;
const pendingEvents=[];
const S={
  ck:sessionStorage.getItem(CLAUDE_KEY)||"",gk:sessionStorage.getItem(GEMMA_KEY)||"",
  mode:sessionStorage.getItem(MODE_KEY)||"auto",
  runtime:sessionStorage.getItem(RUNTIME_KEY)||(location.protocol==="file:"?"browser":"proxy"),
  access:sessionStorage.getItem(ACCESS_KEY)||"",
  password:sessionStorage.getItem(PASS_KEY)||"",
  learnerName:sessionStorage.getItem(NAME_KEY)||"",
  auth:false,api:"local",last:"Local demo",
  screen:sessionStorage.getItem(ACCESS_KEY)?(sessionStorage.getItem(NAME_KEY)?"landing":"register"):"auth",
  authError:"",load:0,tab:"overview",topic:"All Topics",diff:"medium",
  modal:false,note:null,flow:0,exam:null,ov:null,topics:[],selectedExams:JSON.parse(sessionStorage.getItem(EXAM_KEY)||"[]"),activeExamIndex:0,
  practice:{cache:{},cur:"",ans:{},seed:0},
  teach:{open:{},cache:{}},
  chat:[{r:"assistant",t:"Ask any exam-aware doubt here. If live API fails, local coaching mode answers instead."}],
  sending:false,
  prog:{a:0,c:0,w:0,acc:0,net:0,st:0,best:0,t:{},d:{},feed:[]},
  mock:{cfg:null,run:null,res:null,h:[]},
  serverProfile:null,adminData:null,adminLoading:false
};

/* ===== PRESETS ===== */
const PRESETS={};
Object.assign(PRESETS,{
  "ssc gd":{label:"SSC GD",topics:["Arithmetic","Reasoning","General Awareness","English","Science","History","Geography"],diff:"Medium",sum:"SSC GD Constable — 80 questions, 160 marks, 60 minutes. 0.5 negative marking.",str:["Start with General Awareness for quick wins.","Use elimination in GK questions.","Keep maths and reasoning for the end.","Manage time: 15 min per section."],plan:[["Foundation","Week 1-2","Math speed and static GK."],["Build","Week 3-4","Mixed sets and English accuracy."],["Exam Mode","Final 7 days","Timed drills and revision."]],inst:["Total: 80 questions, 160 marks.","Correct: +2 marks.","Wrong: -0.5 marks (negative marking).","Time: 60 minutes total (15 min per section).","No section lock — attempt in any order."],nav:"free",total:60,lang:"en",secs:[["General Intelligence & Reasoning",15,20,2,.5,["Reasoning"]],["General Knowledge",15,20,2,.5,["General Awareness","History","Geography","Science"]],["Elementary Mathematics",15,20,2,.5,["Arithmetic"]],["English",15,20,2,.5,["English"]]]},
  "upsc":{label:"UPSC CSE Prelims",topics:["History","Geography","Polity","Economy","Science","Current Affairs"],diff:"High",sum:"UPSC CSE Prelims — 100 questions, 200 marks, 2 hours. 1/3 negative marking.",str:["Treat elimination as a scoring tool.","Link static topics with current affairs.","Protect accuracy before reach."],plan:[["Base Build","Weeks 1-3","NCERT and polity-geography basics."],["Integration","Weeks 4-5","Current linkage and MCQs."],["Revision","Final 10 days","Mock review and elimination practice."]],inst:["Total: 100 questions, 200 marks.","Correct: +2 marks.","Wrong: -0.66 marks (1/3 negative).","Time: 2 hours.","No section lock."],nav:"free",total:120,lang:"en",secs:[["History & Polity",40,34,2,.66,["History","Polity"]],["Geography & Environment",40,33,2,.66,["Geography","Science"]],["Economy & Current Affairs",40,33,2,.66,["Economy","Current Affairs"]]]},
  "kerala psc":{label:"Kerala PSC (General)",topics:["General Awareness","History","Geography","Polity","Science","English","Current Affairs"],diff:"Medium",sum:"Kerala PSC General — 100 questions, 100 marks, 75 minutes. 1/3 negative marking.",str:["Keep Kerala-specific notes short.","Score easy GK cleanly.","Use daily mixed sets."],plan:[["Base","Week 1","Static GK and science basics."],["Mix","Week 2-3","Topic rotation with timers."],["Push","Final 5 days","State revision and mocks."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks (1/3 negative).","Time: 75 minutes."],nav:"free",total:75,lang:"en",secs:[["General Knowledge",25,33,1,.33,["General Awareness","History","Geography"]],["Polity & Science",25,34,1,.33,["Polity","Science"]],["Language & Mental Ability",25,33,1,.33,["English","Arithmetic","Reasoning"]]]},
  "kerala psc ldc":{label:"Kerala PSC LDC",topics:["General Awareness","History","Geography","Science","Maths","English","Malayalam","Current Affairs","Kerala GK"],diff:"Medium",sum:"Kerala PSC LDC — 100 questions, 100 marks, 75 minutes. Malayalam medium.",str:["Master Kerala history and geography first.","Practice maths shortcuts daily.","Revise Renaissance and social reform movements."],plan:[["Foundation","Week 1-2","Kerala GK, basic science, freedom movement."],["Build","Week 3-4","Maths speed, English grammar, current affairs."],["Mock Push","Final week","Full-length timed mocks with review."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 75 minutes.","Medium: Malayalam."],nav:"free",total:75,lang:"ml",secs:[["Kerala & India GK",25,33,1,.33,["General Awareness","Kerala GK","History","Geography"]],["Science & Maths",25,34,1,.33,["Science","Maths"]],["Language & Current Affairs",25,33,1,.33,["English","Malayalam","Current Affairs"]]]},
  "kerala psc lgs":{label:"Kerala PSC LGS",topics:["General Awareness","Science","Maths","Mental Ability","Kerala GK","Current Affairs"],diff:"Easy",sum:"Kerala PSC LGS — 100 questions, 100 marks, 75 minutes. Malayalam medium.",str:["Focus on frequently repeated questions.","Practice number series and coding.","Kerala Renaissance is a must."],plan:[["Basics","Week 1","Kerala GK, basic science, simple maths."],["Practice","Week 2-3","Daily 50-question sets."],["Revision","Final 5 days","Previous year patterns."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 75 minutes.","Medium: Malayalam."],nav:"free",total:75,lang:"ml",secs:[["Kerala GK & Renaissance",25,33,1,.33,["General Awareness","Kerala GK"]],["Science & Simple Maths",25,34,1,.33,["Science","Maths"]],["Mental Ability & Current",25,33,1,.33,["Mental Ability","Current Affairs"]]]},
  "kerala psc veo":{label:"Kerala PSC VEO",topics:["General Awareness","Panchayat","Agriculture","Kerala GK","Science","Current Affairs"],diff:"Medium",sum:"Kerala PSC VEO — 100 questions, 100 marks, 75 minutes. Malayalam medium.",str:["Know the 73rd Amendment thoroughly.","Study Kerala Panchayat Raj Act.","Agriculture schemes and rural development."],plan:[["Base","Week 1","Panchayat system, Kerala local governance."],["Expand","Week 2-3","Agriculture, rural schemes, GK."],["Polish","Final week","Mock tests and revision."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 75 minutes.","Medium: Malayalam."],nav:"free",total:75,lang:"ml",secs:[["Panchayat Raj & Governance",25,33,1,.33,["Panchayat","General Awareness"]],["Agriculture & Rural Economy",25,34,1,.33,["Agriculture","Kerala GK"]],["GK & Current Affairs",25,33,1,.33,["Science","Current Affairs"]]]},
  "kerala psc hsa":{label:"Kerala PSC HSA English",topics:["English Literature","Grammar","Pedagogy","General Awareness","Current Affairs"],diff:"Medium",sum:"Kerala PSC HSA English — 100 questions, 100 marks, 90 minutes.",str:["Cover major literary movements.","Grammar rules must be exam-ready.","Pedagogy weightage is increasing."],plan:[["Literature","Week 1-2","Major authors, movements, works."],["Grammar & Pedagogy","Week 3","Advanced grammar, teaching methods."],["Mock","Final week","Timed practice sets."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 90 minutes."],nav:"free",total:90,lang:"en",secs:[["English Literature",30,33,1,.33,["English Literature"]],["Grammar & Language",30,34,1,.33,["Grammar","English"]],["Pedagogy & GK",30,33,1,.33,["Pedagogy","General Awareness","Current Affairs"]]]},
  "kerala psc degree":{label:"Kerala PSC Degree Level",topics:["General Awareness","History","Geography","Polity","Science","Maths","Mental Ability","English","Current Affairs"],diff:"High",sum:"Kerala PSC Degree Level — 100 questions, 100 marks, 90 minutes.",str:["Cover NCERT thoroughly.","Current affairs of last 6 months.","Mental ability needs daily practice."],plan:[["NCERT Base","Week 1-2","History, geography, polity basics."],["Advanced","Week 3-4","Science, economy, current linkage."],["Exam Prep","Final week","Full mocks and error analysis."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 90 minutes."],nav:"free",total:90,lang:"en",secs:[["History, Polity & Geography",30,34,1,.33,["History","Polity","Geography"]],["Science & Mental Ability",35,33,1,.33,["Science","Maths","Mental Ability"]],["Economy & Current Affairs",35,33,1,.33,["Economy","English","Current Affairs"]]]},
  "kerala psc si":{label:"Kerala PSC SI Police",topics:["Law","General Awareness","Maths","Mental Ability","Current Affairs","Science"],diff:"High",sum:"Kerala PSC SI Police — 100 questions, 100 marks, 90 minutes.",str:["Indian Penal Code and CrPC are key.","Maths should be fast and accurate.","Current affairs with legal angle."],plan:[["Law Base","Week 1-2","IPC, CrPC, Evidence Act basics."],["GK + Maths","Week 3","Quantitative aptitude, general science."],["Mock Mode","Final week","Timed full tests."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.33 marks.","Time: 90 minutes."],nav:"free",total:90,lang:"en",secs:[["Law (IPC, CrPC, Evidence)",30,34,1,.33,["Law"]],["GK, Science & Current Affairs",35,33,1,.33,["General Awareness","Science","Current Affairs"]],["Maths & Mental Ability",35,33,1,.33,["Maths","Mental Ability"]]]},
  "sbi po":{label:"SBI PO Prelims",topics:["Arithmetic","Reasoning","English","Banking Awareness","Current Affairs"],diff:"High",sum:"SBI PO Prelims — 100 questions, 100 marks, 60 minutes. 0.25 negative marking.",str:["Skip setup-heavy puzzles early.","English is the scoring section.","Keep time management strict."],plan:[["Base","Week 1-2","Arithmetic and comprehension."],["Layer","Week 3","Banking awareness plus current."],["Timed Push","Final 7 days","Section-timed mocks."]],inst:["Total: 100 questions, 100 marks.","Correct: +1 mark.","Wrong: -0.25 marks.","Time: 60 minutes.","Sections have individual time limits."],nav:"locked",total:60,lang:"en",secs:[["English Language",20,30,1,.25,["English"]],["Quantitative Aptitude",20,35,1,.25,["Arithmetic"]],["Reasoning Ability",20,35,1,.25,["Reasoning","Banking Awareness"]]]},
  "afcat":{label:"AFCAT",topics:["General Awareness","English","Reasoning","Arithmetic","Science","Current Affairs"],diff:"High",sum:"AFCAT — 100 questions, 300 marks, 2 hours. 1 mark wrong = -1.",str:["Each wrong answer costs heavily.","Take quick verbal and GK wins first.","Do not guess blindly in numericals."],plan:[["Warm-up","Week 1","Vocabulary and basic numericals."],["Acceleration","Week 2-3","Mixed AFCAT-style sets."],["Exam Pace","Final 6 days","Timed simulations and guess control."]],inst:["Total: 100 questions, 300 marks.","Correct: +3 marks.","Wrong: -1 mark (hefty penalty).","Time: 2 hours.","No section lock."],nav:"free",total:120,lang:"en",secs:[["General Awareness",30,25,3,1,["General Awareness","Current Affairs","History"]],["Verbal Ability",30,25,3,1,["English"]],["Reasoning",30,25,3,1,["Reasoning"]],["Numerical Ability",30,25,3,1,["Arithmetic","Science"]]]}
});

/* ===== EXAM CATEGORIES for Register Screen ===== */
const EXAM_CATEGORIES=[
  {name:"SSC / Defence",exams:[{id:"ssc gd",label:"SSC GD"},{id:"afcat",label:"AFCAT"}]},
  {name:"Banking",exams:[{id:"sbi po",label:"SBI PO"}]},
  {name:"Civil Services",exams:[{id:"upsc",label:"UPSC Prelims"}]},
  {name:"Kerala PSC (മലയാളം)",exams:[
    {id:"kerala psc ldc",label:"LDC",lang:"ml"},
    {id:"kerala psc lgs",label:"LGS",lang:"ml"},
    {id:"kerala psc veo",label:"VEO",lang:"ml"}
  ]},
  {name:"Kerala PSC (English)",exams:[
    {id:"kerala psc hsa",label:"HSA English"},
    {id:"kerala psc degree",label:"Degree Level"},
    {id:"kerala psc si",label:"SI Police"},
    {id:"kerala psc",label:"General"}
  ]}
];

/* ===== QUESTION BANK ===== */
const BANK=[];
BANK.push(
  {t:"Arithmetic",d:"easy",q:"25% of 240 is?",o:["40","50","60","75"],a:2,e:"25% means one-fourth. 240/4 = 60.",s:"Quarter values save time."},
  {t:"Arithmetic",d:"medium",q:"Train covers 180 km in 3 hours. Speed?",o:["50 km/h","55 km/h","60 km/h","65 km/h"],a:2,e:"180/3 = 60 km/h.",s:"Speed = distance / time."},
  {t:"Arithmetic",d:"medium",q:"If A can do a work in 12 days and B in 18 days, together?",o:["6.2 days","7.2 days","8.5 days","9 days"],a:1,e:"1/12 + 1/18 = 5/36. So 36/5 = 7.2 days.",s:"Add reciprocals, flip."},
  {t:"Reasoning",d:"easy",q:"Next number: 2, 4, 8, 16, ?",o:["18","24","32","34"],a:2,e:"Each term doubles.",s:"Check simple multiplication first."},
  {t:"Reasoning",d:"medium",q:"DOG in A=1, B=2 code is?",o:["4-15-7","4-15-15","4-17-7","15-4-7"],a:0,e:"D=4, O=15, G=7.",s:"Map letter values separately."},
  {t:"English",d:"easy",q:"Synonym of 'rapid'?",o:["Slow","Swift","Weak","Calm"],a:1,e:"Rapid means swift/fast.",s:"Check meaning, not spelling."},
  {t:"English",d:"medium",q:"Correct sentence?",o:["He do not like tea.","He does not likes tea.","He does not like tea.","He not like tea."],a:2,e:"With 'does', main verb stays base form.",s:"Does + base verb."},
  {t:"General Awareness",d:"easy",q:"Capital of India?",o:["Mumbai","Chennai","New Delhi","Kolkata"],a:2,e:"New Delhi is the capital of India.",s:"Lock basic capitals early."},
  {t:"General Awareness",d:"medium",q:"Which planet is called the Red Planet?",o:["Venus","Mars","Jupiter","Mercury"],a:1,e:"Mars appears red due to iron oxide on its surface.",s:"Red Planet = Mars."},
  {t:"Science",d:"easy",q:"Boiling point of water at 1 atm?",o:["90°C","100°C","110°C","120°C"],a:1,e:"Water boils at 100°C at standard pressure.",s:"0 freeze, 100 boil."},
  {t:"Science",d:"medium",q:"Which gas do plants absorb during photosynthesis?",o:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],a:2,e:"Plants absorb CO₂ and release O₂.",s:"CO₂ in, O₂ out."},
  {t:"History",d:"easy",q:"Founder of Maurya Empire?",o:["Ashoka","Chandragupta Maurya","Harsha","Bindusara"],a:1,e:"Chandragupta Maurya founded the empire in 321 BC.",s:"Founder came before Ashoka."},
  {t:"History",d:"medium",q:"Who started the Civil Disobedience Movement?",o:["Nehru","Subhas Bose","Mahatma Gandhi","Sardar Patel"],a:2,e:"Gandhi started it with the Dandi March in 1930.",s:"Dandi March = Civil Disobedience."},
  {t:"Geography",d:"easy",q:"Longest river in India?",o:["Yamuna","Godavari","Ganga","Narmada"],a:2,e:"Ganga is the longest river in India.",s:"Ganga is the first river anchor."},
  {t:"Polity",d:"easy",q:"Father of Indian Constitution?",o:["Nehru","Ambedkar","Gandhi","Patel"],a:1,e:"Dr. B.R. Ambedkar chaired the Drafting Committee.",s:"Ambedkar = Constitution."},
  {t:"Economy",d:"easy",q:"GDP stands for?",o:["Gross Domestic Product","General Demand Price","Gross Development Plan","General Domestic Product"],a:0,e:"GDP = Gross Domestic Product.",s:"Know economy abbreviations."},
  {t:"Current Affairs",d:"medium",q:"Best current affairs prep strategy?",o:["Read only headlines","Ignore revision","Revise monthly notes","Memorize random dates"],a:2,e:"Monthly revision notes improve recall.",s:"Revision loops beat random reading."},
  {t:"Banking Awareness",d:"easy",q:"RBI stands for?",o:["Reserve Bank of India","Regional Bank of India","Rural Bank of India","Reserve Board of India"],a:0,e:"RBI = Reserve Bank of India.",s:"Keep full forms ready."},
  {t:"Maths",d:"easy",q:"What is 15% of 200?",o:["25","30","35","40"],a:1,e:"15/100 × 200 = 30.",s:"10% + 5% shortcut."},
  {t:"Maths",d:"medium",q:"Average of 12, 15, 18, 21, 24?",o:["17","18","19","20"],a:1,e:"Sum=90, count=5, average=18.",s:"Middle number in arithmetic series."},
  {t:"Mental Ability",d:"easy",q:"If APPLE is coded as 1-16-16-12-5, what is BAT?",o:["2-1-20","2-1-19","3-1-20","2-2-20"],a:0,e:"B=2, A=1, T=20.",s:"A=1 position coding."},
  // Kerala-specific GK
  {t:"Kerala GK",d:"easy",q:"Capital of Kerala?",o:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"],a:2,e:"Thiruvananthapuram is the capital of Kerala.",s:"TVM = Kerala capital."},
  {t:"Kerala GK",d:"easy",q:"Who is known as the father of Kerala Renaissance?",o:["Ayyankali","Sree Narayana Guru","Chattampi Swamikal","Kumaranasan"],a:1,e:"Sree Narayana Guru spearheaded social reform in Kerala.",s:"Renaissance = Sree Narayana Guru."},
  {t:"Kerala GK",d:"medium",q:"Kerala was formed on?",o:["1 Nov 1956","15 Aug 1947","26 Jan 1950","1 Nov 1957"],a:0,e:"Kerala state was formed on 1 November 1956.",s:"1956 = Kerala, Karnataka, AP formation."},
  {t:"Kerala GK",d:"medium",q:"Longest river in Kerala?",o:["Pamba","Periyar","Bharathapuzha","Chaliyar"],a:2,e:"Bharathapuzha (Nila) is the longest river in Kerala at 209 km.",s:"Bharathapuzha = longest, Periyar = largest by volume."},
  {t:"Kerala GK",d:"easy",q:"Which is the first district formed in Kerala?",o:["Ernakulam","Thiruvananthapuram","Kannur","Thrissur"],a:2,e:"Kannur was the first formed district of Kerala.",s:"Kasaragod was the last."},
  // Malayalam medium questions (for LDC/LGS)
  {t:"Kerala GK",d:"easy",q:"കേരളത്തിന്റെ തലസ്ഥാനം ഏത്?",o:["കൊച്ചി","കോഴിക്കോട്","തിരുവനന്തപുരം","തൃശ്ശൂർ"],a:2,e:"തിരുവനന്തപുരം ആണ് കേരളത്തിന്റെ തലസ്ഥാനം.",s:"TVM = കേരള തലസ്ഥാനം.",lang:"ml"},
  {t:"Kerala GK",d:"easy",q:"കേരള നവോത്ഥാനത്തിന്റെ പിതാവ് ആര്?",o:["അയ്യൻകാളി","ശ്രീനാരായണ ഗുരു","ചട്ടമ്പിസ്വാമികൾ","കുമാരനാശാൻ"],a:1,e:"ശ്രീനാരായണ ഗുരു കേരളത്തിലെ സാമൂഹിക നവോത്ഥാനത്തിന് നേതൃത്വം നൽകി.",s:"നവോത്ഥാനം = ശ്രീനാരായണ ഗുരു.",lang:"ml"},
  {t:"Science",d:"easy",q:"ജലത്തിന്റെ തിളനില എത്ര?",o:["90°C","100°C","110°C","120°C"],a:1,e:"ജലം 1 atm ൽ 100°C ൽ തിളക്കുന്നു.",s:"0 ഫ്രീസ്, 100 ബോയിൽ.",lang:"ml"},
  {t:"Maths",d:"easy",q:"240 ന്റെ 25% എത്ര?",o:["40","50","60","75"],a:2,e:"25% = നാലിലൊന്ന്. 240/4 = 60.",s:"ക്വാർട്ടർ = 25%.",lang:"ml"},
  {t:"General Awareness",d:"easy",q:"ഇന്ത്യയുടെ തലസ്ഥാനം ഏത്?",o:["മുംബൈ","ചെന്നൈ","ന്യൂഡൽഹി","കൊൽക്കത്ത"],a:2,e:"ന്യൂഡൽഹി ഇന്ത്യയുടെ തലസ്ഥാനമാണ്.",s:"ന്യൂഡൽഹി = ഇന്ത്യ.",lang:"ml"},
  {t:"History",d:"medium",q:"മൗര്യ സാമ്രാജ്യത്തിന്റെ സ്ഥാപകൻ ആര്?",o:["അശോകൻ","ചന്ദ്രഗുപ്ത മൗര്യ","ഹർഷൻ","ബിന്ദുസാരൻ"],a:1,e:"ചന്ദ്രഗുപ്ത മൗര്യ BC 321-ൽ മൗര്യ സാമ്രാജ്യം സ്ഥാപിച്ചു.",s:"മൗര്യ സ്ഥാപകൻ = ചന്ദ്രഗുപ്ത.",lang:"ml"}
);

/* ===== HELPERS ===== */
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const norm=s=>(s||"").toLowerCase().trim().replace(/\s+/g," ");
const tc=s=>String(s||"").split(" ").filter(Boolean).map(x=>x[0].toUpperCase()+x.slice(1)).join(" ");
const money=n=>Number(n||0).toFixed(2);
const tm=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const hasKey=v=>!!(v&&String(v).trim());
const hasAnyKey=()=>hasKey(S.ck)||hasKey(S.gk);
const hasLive=()=>S.runtime==="proxy"||hasAnyKey();
const modeLabel=m=>m==="claude"?"Claude only":m==="gemma"?"Gemma only":"Auto";
const runtimeLabel=r=>r==="proxy"?"Secure proxy":"Browser keys";
const providerLabel=p=>p==="proxy"?"Secure proxy":p==="gemma"?"Gemma":"Claude";
const liveSource=()=>S.runtime==="proxy"?"proxy":"ai";

/* ===== PRESET MATCHING ===== */
function presetFor(v){
  const n=norm(v);
  // Check specific Kerala PSC streams first
  if(n.includes("kerala")&&n.includes("ldc"))return PRESETS["kerala psc ldc"];
  if(n.includes("kerala")&&n.includes("lgs"))return PRESETS["kerala psc lgs"];
  if(n.includes("kerala")&&n.includes("veo"))return PRESETS["kerala psc veo"];
  if(n.includes("kerala")&&n.includes("hsa"))return PRESETS["kerala psc hsa"];
  if(n.includes("kerala")&&n.includes("degree"))return PRESETS["kerala psc degree"];
  if(n.includes("kerala")&&(n.includes("si")||n.includes("police")))return PRESETS["kerala psc si"];
  if(n.includes("kerala")||n.includes("psc"))return PRESETS["kerala psc"];
  if(n.includes("ssc"))return PRESETS["ssc gd"];
  if(n.includes("upsc"))return PRESETS["upsc"];
  if(n.includes("sbi"))return PRESETS["sbi po"];
  if(n.includes("afcat"))return PRESETS["afcat"];
  return null;
}

function examTopics(v){
  const p=presetFor(v);
  if(p)return p.topics;
  const n=norm(v);
  if(n.includes("bank")||n.includes("po"))return["Arithmetic","Reasoning","English","Banking Awareness","Current Affairs"];
  if(n.includes("psc"))return["General Awareness","History","Geography","Polity","Science","English"];
  return["Arithmetic","Reasoning","English","General Awareness","Current Affairs","Science"];
}

function isExamMalayalam(examName){
  const p=presetFor(examName);
  return p&&p.lang==="ml";
}

function ovFallback(name,p){
  return p?{examTitle:p.label,difficulty:p.diff,patternSummary:p.sum,strategy:p.str,timePlan:p.plan,syllabusTopics:p.topics,lang:p.lang||"en"}:{examTitle:tc(name),difficulty:"Medium",patternSummary:"Adaptive exam map generated locally.",strategy:["Start with dependable scoring topics.","Use daily mixed practice.","Revisit errors every 48 hours."],timePlan:[["Map","Days 1-2","Lock syllabus and priority."],["Build","Days 3-10","Topic drills and doubt clearing."],["Simulate","Final stretch","Timed sets and review."]],syllabusTopics:examTopics(name),lang:"en"};
}

function guide(topic){
  const n=norm(topic);
  const guides={
    "arithmetic":{summary:"Arithmetic covers number systems, percentages, ratios, profit-loss, time-work, and speed-distance. Master shortcuts for faster calculation.",key:["Percentage: (Part/Whole)*100","Ratio: Divide in proportion","Profit = SP-CP, Loss = CP-SP","Time-Work: Work = Rate * Time","Speed = Distance/Time"],short:["Percentage shortcut: x% of y = y% of x","Fraction to decimal: 1/7=0.142, 1/9=0.111","Use V/T = D/S for time-work problems"],example:"Find 15% of 80: 10% = 8, 5% = 4, Total = 12",mist:["Do not confuse profit% with profit amount","Remember negative marks in exam"]},
    "reasoning":{summary:"Reasoning tests logical thinking through blood relations, coding-decoding, puzzles, direction sense, and series completion.",key:["Blood Relations: Use family tree method","Coding: Apply alphabet position (A=1)","Direction: N-E-S-W clockwise","Series: Find pattern (multiply 2, add 3)","Puzzle: Make a grid for data"],short:["Odd one out: Find unique property","Analogy: A:B = C:? relation","Calendar: Odd days concept"],example:"If A is B brother, B is C mother: A is C maternal uncle",mist:["Do not assume gender in blood relations","Check direction changes carefully"]},
    "english":{summary:"English covers grammar (tenses, articles, voice, narration), vocabulary (synonyms, antonyms), comprehension, and error detection.",key:["Tense: Past to Present forms","Subject-Verb Agreement rules","Voice: Active to Passive transformation","Narration: Direct to Indirect rules","Synonyms: Learn word families"],short:["Article An before vowel sound","Much/Many: Uncountable/Countable","Preposition: AT for time, IN for period"],example:"He said that he was coming",mist:["Do not use a before vowel sound words","Preposition errors are common"]},
    "general awareness":{summary:"GA covers Indian Polity, History, Geography, Science, Economics, and Current Affairs. Focus on static GK with current updates.",key:["Indian Constitution: Parts, Schedules, Amendments","History: Freedom struggle timeline","Geography: Rivers, mountains, climate","Science: Physics, Chemistry, Biology basics","Economy: Budget, RBI, Banking"],short:["Static GK repeats frequently","Link current affairs with static topics","Make mnemonics for lists"],example:"Parts of Indian Constitution: 1-Fundamental Rights, 2-Directive Principles, 3-Fundamental Duties, 4-Executive",mist:["Do not memorize without understanding","Current affairs need regular revision"]},
    "science":{summary:"Science covers Physics, Chemistry, and Biology. Focus on formulas, chemical reactions, and biological processes.",key:["Physics: Laws, formulas, units","Chemistry: Elements, compounds, reactions","Biology: Human body, plants, ecology","Physics: F=ma, V=IR, W=F*d","Biology: Cell structure, photosynthesis"],short:["Physics: Memorize formulas with units","Chemistry: Periodic table groups","Biology: Diagrams help recall"],example:"Newton 3 Laws: 1-Inertia, 2-F=ma, 3-Action-Reaction",mist:["Do not confuse mass and weight","Unit conversion errors are common"]},
    "history":{summary:"History covers Ancient, Medieval, and Modern India with emphasis on freedom struggle, rulers, and important events.",key:["Ancient: Indus Valley, Vedic period, Buddhism","Medieval: Delhi Sultanate, Mughals","Modern: 1857, Congress, Freedom movement","Important battles and treaties","Reforms and Governor-Generals"],short:["Make timeline of rulers","Link events with years","Focus on freedom struggle leaders"],example:"1857 Revolt: Started at Meerut, led by Bahadur Shah Zafar, suppressed by British",mist:["Do not confuse dates and events","Know cause-effect relationships"]},
    "geography":{summary:"Geography covers physical, Indian, and world geography including landforms, climate, resources, and mapping.",key:["Physical: Mountains, rivers, climate zones","Indian: States, capitals, resources","World: Continents, oceans, deserts","Map-based questions common","Climate: Monsoon, cyclones, seasons"],short:["India rivers: Ganga, Brahmaputra, Godavari","Mountains: Himalayas, Western Ghats","States and capitals revision"],example:"Northern Plains: Formed by Indus, Ganga, Brahmaputra. Alluvial soil, fertile land",mist:["Do not confuse physical features","Practice map reading"]},
    "polity":{summary:"Polity covers Indian Constitution, Parliament, Executive, Judiciary, and fundamental rights with articles.",key:["Constitution: Parts, Schedules, Articles","Parliament: Lok Sabha, Rajya Sabha","Executive: President, PM, Council of Ministers","Judiciary: Supreme Court, High Courts","Fundamental Rights: Articles 12-35"],short:["Article 14: Equality before law","Article 19: Six freedoms","Article 21: Right to life","Article 32: Supreme Court for rights"],example:"President: Indirectly elected by MLAs, serves 5 years, can be impeached",mist:["Do not confuse President and PM powers","Know emergency provisions"]},
    "kerala gk":{summary:"Kerala GK covers state-specific topics including history, geography, culture, and important facts about Kerala.",key:["Capital: Thiruvananthapuram","Rivers: Periyar, Bharathapuzha, Pamba","Districts: 14 districts from Kasaragod to Thiruvananthapuram","Kerala Renaissance: Sree Narayana Guru, Ayyankali","Social reform movements and leaders"],short:["Kasaragod: Northernmost district","Malappuram: Largest population","Kochi: Financial capital","Kasaragod first, Thiruvananthapuram last"],example:"Kerala Renaissance: Led by Sree Narayana Guru, Ayyankali, Chattampi Swamikal",mist:["Do not confuse district facts","Know river and dam details"]},
    "banking awareness":{summary:"Banking covers banking system, RBI, monetary policy, financial institutions, and recent banking developments.",key:["RBI: Central bank, monetary policy","Types of accounts: Savings, Current, FD","Priority sector lending","NPA, CRR, SLR, Repo rate","Digital banking, UPI, Payment systems"],short:["RBI Governor: Appointed by PM","CRR: Cash with RBI from banks","SLR: Securities with banks","Repo Rate: RBI borrows from banks"],example:"RBI increases Repo Rate - Banks charge more - Borrowing decreases - Inflation controls",mist:["Do not confuse RBI and Government functions","Know current rates"]},
    "economics":{summary:"Economics covers micro and macro economics, planning, budget, taxation, and economic development concepts.",key:["GDP, GNP, NDP concepts","Inflation: CPI, WPI","Budget: Direct/Indirect tax","Five Year Plans: Objectives","Banking and financial institutions"],short:["GDP at market price vs factor cost","Types of inflation: Demand-pull, Cost-push","SDR: Supplementary Duty"],example:"Budget 2024: Focused on infrastructure, healthcare, education spending",mist:["Do not confuse economic terms","Know current economic policies"]},
    "current affairs":{summary:"Current affairs covers recent events in politics, sports, awards, appointments, and important dates.",key:["Government schemes and policies","International summits and agreements","Sports events and awards","Important appointments","Days and themes: Important dates"],short:["Read newspapers daily","Focus on last 6 months","Make notes of important events"],example:"G20 Summit 2023: Hosted in India, New Delhi, theme Vasudhaiva Kutumbakam",mist:["Do not read passively","Revise weekly"]},
    "mental ability":{summary:"Mental ability covers number series, analogies, classification, coding-decoding, and puzzle solving.",key:["Number series: Find the pattern","Analogy: Word relationships","Coding: Alphabet positions","Direction sense: N,E,S,W turns","Blood relations: Family tree"],short:["Series pattern: plus 4,6,8,10","Odd one out: Find unique property","Clock angles: 90 at 3, 180 at 6"],example:"Number series: 2, 6, 12, 20, 30, ? Pattern: plus 4,6,8,10,12. Next: 44",mist:["Do not guess without finding pattern","Check all options systematically"]},
    "maths":{summary:"Maths covers arithmetic, algebra, geometry, mensuration, and data interpretation for competitive exams.",key:["Arithmetic: Percentage, Ratio, Profit-Loss","Algebra: Equations, Quadratic formula","Geometry: Theorems, Properties","Mensuration: Area, Volume formulas","DI: Charts, Tables, Graphs"],short:["SI/CI: A=P(1+r/n)^nt","Geometry: 180 in triangle","Mensuration: pi*r*r for circle"],example:"Compound Interest: P=10000, R=10%, T=2 years - A=12100, CI=2100",mist:["Do not forget to convert time units","Check decimal places"]},
    "law":{summary:"Law covers Indian Penal Code, Criminal Procedure Code, Evidence Act, and constitutional law basics.",key:["IPC Sections: 302 Murder, 376 Rape, 420 Cheating","CrPC: FIR, Cognizance, Trial procedure","Evidence Act: Types of evidence","Constitutional provisions for law","Recent amendments and judgments"],short:["Bailable vs Non-bailable offense","Cognizable vs Non-cognizable","Anticipatory bail under IPC 438"],example:"FIR: First Information Report to police for cognizable offense",mist:["Do not confuse IPC with CrPC","Know landmark judgments"]},
    "literature":{summary:"English Literature covers major authors, literary movements, famous works, and literary terms.",key:["Literary periods: Elizabethan, Victorian, Modern","Authors: Shakespeare, Dickens, Tagore","Forms: Sonnet, Ode, Ballad, Drama","Literary terms: Alliteration, Metaphor, Simile","Themes and characters from famous works"],short:["Shakespeare: Romeo Juliet, Macbeth, Hamlet","Dickens: Oliver Twist, A Christmas Carol","Tagore: Gitanjali, Gora"],example:"Metaphor example: All the worlds a stage - comparing life to theater",mist:["Do not confuse literary terms","Know author-work pairs"]},
    "pedagogy":{summary:"Pedagogy covers teaching methods, child psychology, educational psychology, and assessment techniques.",key:["Learning theories: Behaviorism, Cognitivism, Constructivism","Child development stages","Teaching methods: Lecture, Discussion, Activity","Intelligence types: Multiple Intelligences","Assessment: Formative, Summative"],short:["Blooms Taxonomy: Remember, Understand, Apply, Analyze, Evaluate, Create","NCF 2005 principles","Constructivism: Learning by doing"],example:"Gagne Nine Events: 1-Gain attention, 2-Inform objectives, 3-Present content",mist:["Do not memorize without understanding","Apply concepts to classroom scenarios"]},
    "grammar":{summary:"Grammar covers parts of speech, sentence structure, tenses, voice, narration, and error detection.",key:["Parts of speech: Noun, Verb, Adjective, Adverb","Tenses: Present, Past, Future forms","Subject-Verb Agreement rules","Direct-Indirect Speech rules","Active-Passive Voice rules"],short:["Neither nor: Verb agrees with nearer subject","Each, Every, Either: Always singular","Had better, Would rather: Followed by base verb"],example:"Neither the students nor the teacher WAS present (teacher is nearer to was)",mist:["Do not confuse principal and subordinate clauses","Watch for subject-verb number"]},
    "computer":{summary:"Computer covers hardware, software, internet, MS Office, and basic programming concepts.",key:["Hardware: CPU, RAM, ROM, Storage devices","Software: System, Application software","Internet: WWW, Browser, Email","MS Office: Word, Excel, PowerPoint","Basics of programming logic"],short:["RAM: Temporary, volatile","ROM: Permanent, non-volatile","CPU: Brain of computer"],example:"Input Process Output. CPU processes data using ALU and Control Unit",mist:["Do not confuse RAM and ROM","Know hardware functions"]}
  };
  const normalizedKey=Object.keys(guides).find(k=>n.includes(k))||"general awareness";
  const g=guides[normalizedKey]||{summary:"Build through short revision loops and one anchor example.",key:["Identify question type first.","Use elimination early.","Keep one-line revision notes."],short:["Reduce to one repeatable rule.","Do not over-solve when options eliminate."],example:"Use "+topic+" with one anchor fact and one quick recall pattern.",mist:["Rushing the base concept.","Skipping revision after a correct answer."]};
  return g;
}

/* ===== QUESTION POOL ===== */
function qpool(topics,diff,useMl){
  let p=BANK.filter(x=>{
    const match=topics.map(norm).includes(norm(x.t));
    if(useMl)return match;
    return match&&!x.lang;
  });
  if(diff&&diff!=="mixed"&&diff!==""){const f=p.filter(x=>norm(x.d)===norm(diff));if(f.length)p=f;}
  if(useMl){const mlQ=p.filter(x=>x.lang==="ml");if(mlQ.length>=3)p=mlQ;}
  return p.length?p:BANK.filter(x=>!x.lang);
}
function cloneQ(q,i){return{id:`q${Date.now()}${i}${Math.random().toString(36).slice(2,5)}`,t:q.t,d:q.d,q:q.q,o:[...q.o],a:q.a,e:q.e,s:q.s,lang:q.lang||null};}

/* ===== AUTH API ===== */
async function verifyAccess(code,password){
  try{
    const r=await fetch(AUTH_API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,password})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return{ok:false,error:d.error||"Authentication failed"};
    return{ok:d.ok,required:d.required};
  }catch(e){return{ok:false,error:"Network error. Please check your connection."};}
}

/* ===== LOCAL STORAGE BACKUP ===== */
const PROFILE_LOCAL_KEY="zenprep-local-profile";
function saveLocalProfile(){
  if(!S.learnerName)return;
  const data={learnerName:S.learnerName,exams:{}};
  for(const[examName,examData]of Object.entries(localStorage)){
    if(examName.startsWith("zenprep-prog-")){
      const key=examName.replace("zenprep-prog-","");
      data.exams[key]=JSON.parse(localStorage.getItem(examName)||"{}");
    }
  }
  localStorage.setItem(PROFILE_LOCAL_KEY,JSON.stringify(data));
}
function loadLocalProfile(examName){
  try{
    const raw=localStorage.getItem(PROFILE_LOCAL_KEY);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(data.exams&&data.exams[examName])return data.exams[examName];
  }catch(e){}
  return null;
}
function saveLocalProgress(examName){
  if(!examName||examName==="undefined")return;
  try{
    localStorage.setItem("zenprep-prog-"+examName,JSON.stringify({
      a:S.prog.a,c:S.prog.c,w:S.prog.w,acc:S.prog.acc,net:S.prog.net,
      st:S.prog.st,best:S.prog.best,t:S.prog.t,d:S.prog.d,feed:S.prog.feed,
      mockH:S.mock.h
    }));
  }catch(e){}
}
function loadLocalProgress(examName){
  if(!examName||examName==="undefined")return null;
  try{
    const raw=localStorage.getItem("zenprep-prog-"+examName);
    if(!raw)return null;
    const p=JSON.parse(raw);
    return p;
  }catch(e){return null;}
}

/* ===== PROFILE API (Memory Sync) ===== */
async function loadProfileFromServer(){
  if(!S.access||!S.learnerName)return null;
  try{
    const r=await fetch(PROFILE_API,{method:"POST",headers:{"content-type":"application/json","x-access-code":S.access},body:JSON.stringify({learnerName:S.learnerName,examName:S.exam?.n||"",action:"load"})});
    const d=await r.json().catch(()=>null);
    if(r.ok&&d)return d;
  }catch(e){}
  return null;
}

async function syncEventsToServer(events,examName){
  saveLocalProgress(examName);
  if(!S.access||!S.learnerName||!events.length)return;
  try{
    await fetch(PROFILE_API,{method:"POST",headers:{"content-type":"application/json","x-access-code":S.access},body:JSON.stringify({learnerName:S.learnerName,examName:examName||S.exam?.n||"",action:"trackBatch",events})});
  }catch(e){}
}

async function syncMockToServer(mockResult,events,examName){
  saveLocalProgress(examName);
  if(!S.access||!S.learnerName)return;
  try{
    await fetch(PROFILE_API,{method:"POST",headers:{"content-type":"application/json","x-access-code":S.access},body:JSON.stringify({learnerName:S.learnerName,examName:examName||S.exam?.n||"",action:"trackMock",mockResult,events})});
  }catch(e){}
}

async function syncExamsToServer(){
  if(!S.access||!S.learnerName||!S.selectedExams.length)return;
  try{
    await fetch(PROFILE_API,{method:"POST",headers:{"content-type":"application/json","x-access-code":S.access},body:JSON.stringify({learnerName:S.learnerName,examName:S.selectedExams[0]||"",action:"saveExams",exams:S.selectedExams})});
  }catch(e){}
}

function restoreProgressFromProfile(profileData){
  const examName=S.exam?.n;
  if(profileData&&profileData.currentExam){
    const ex=profileData.currentExam;
    S.prog.a=ex.attempts||0;S.prog.c=ex.correct||0;S.prog.w=ex.wrong||0;
    S.prog.acc=ex.accuracy||0;S.prog.net=ex.net||0;S.prog.st=ex.streak||0;S.prog.best=ex.bestStreak||0;
    if(ex.topics){for(const[k,v]of Object.entries(ex.topics))S.prog.t[k]={a:v.attempts||0,c:v.correct||0};}
    if(ex.difficulties){for(const[k,v]of Object.entries(ex.difficulties))S.prog.d[k]={a:v.attempts||0,c:v.correct||0};}
    if(ex.recent){S.prog.feed=ex.recent.slice(0,8).map(r=>({l:r.label,d:r.detail,s:r.score,t:r.at?new Date(r.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}));}
    if(ex.mockHistory){S.mock.h=ex.mockHistory.slice(0,4).map(m=>({t:m.title,s:money(m.score),a:m.accuracy,tm:m.at?new Date(m.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}));}
    S.serverProfile=profileData;
  }else{
    const local=loadLocalProgress(examName);
    if(local){
      S.prog.a=local.a||0;S.prog.c=local.c||0;S.prog.w=local.w||0;
      S.prog.acc=local.acc||0;S.prog.net=local.net||0;S.prog.st=local.st||0;S.prog.best=local.best||0;
      S.prog.t=local.t||{};S.prog.d=local.d||{};S.prog.feed=local.feed||[];
      S.mock.h=local.mockH||[];
    }
  }
}

function queueEvent(ev){
  pendingEvents.push(ev);
  if(pendingEvents.length>=5)flushEvents();
  else{clearTimeout(syncTimer);syncTimer=setTimeout(flushEvents,8000);}
}
function flushEvents(){
  if(!pendingEvents.length)return;
  const batch=[...pendingEvents];pendingEvents.length=0;
  syncEventsToServer(batch,S.exam?.n).catch(()=>{});
}

/* ===== AI PROVIDER ===== */
function syncConnectionState(){S.auth=hasLive();if(S.api!=="live")S.api=hasLive()?"ready":"local";if(!hasLive())S.last="Local demo";}
function providerQueue(){if(S.runtime==="proxy")return["proxy"];const q=[];if(S.mode!=="gemma"&&hasKey(S.ck))q.push("claude");if(S.mode!=="claude"&&hasKey(S.gk))q.push("gemma");return q;}

async function callProvider(p,sys,user,max,temp,signal){
  if(p==="proxy"){const r=await fetch(PROXY_API,{method:"POST",headers:{"content-type":"application/json",...(S.access?{"x-access-code":S.access}:{})},signal,body:JSON.stringify({system:sys,user,maxTokens:max,temperature:temp,mode:S.mode})}),d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401||r.status===403)throw Error("unauthorized");if(r.status===429)throw Error("rate-limit");throw Error(d.error||"api-proxy");}const c=String(d.text||"").trim();if(!c)throw Error("empty");return{text:c,provider:d.provider||"proxy"};}
  if(p==="claude"){const r=await fetch(CLAUDE_API_URL,{method:"POST",headers:{"content-type":"application/json","x-api-key":S.ck,"anthropic-version":"2023-06-01"},signal,body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:max,temperature:temp,system:sys,messages:[{role:"user",content:user}]})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error("api-claude");const c=Array.isArray(d.content)?d.content.filter(x=>x.type==="text").map(x=>x.text).join("\n").trim():"";if(!c)throw Error("empty-claude");return{text:c,provider:"claude"};}
  const r=await fetch(GEMMA_API_URL,{method:"POST",headers:{"content-type":"application/json","Authorization":"Bearer "+S.gk,"X-Title":"ZenPrep AI"},signal,body:JSON.stringify({model:GEMMA_MODEL,messages:[{role:"system",content:sys},{role:"user",content:user}],max_tokens:max,temperature:temp})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error("api-gemma");const c=d.choices&&d.choices[0]?.message?.content||"";if(!c)throw Error("empty-gemma");return{text:c,provider:"gemma"};
}

async function call(sys,user,max=900,temp=.35){
  const q=providerQueue();if(!q.length){S.api="local";throw Error("nolive");}
  if(C.main)C.main.abort();let lastErr=null;
  for(let i=0;i<q.length;i++){const p=q[i],ctrl=new AbortController;C.main=ctrl;const t=setTimeout(()=>ctrl.abort(),26000);
    try{const out=await callProvider(p,sys,user,max,temp,ctrl.signal);clearTimeout(t);S.api="live";S.auth=hasLive();S.last=p==="proxy"?`${providerLabel(out.provider)} via proxy`:providerLabel(out.provider);return out.text;}
    catch(e){clearTimeout(t);lastErr=e;syncConnectionState();if(i<q.length-1)note(`${providerLabel(p)} unavailable. Falling back...`);}
    finally{delete C.main;}}
  S.api=hasLive()?"bad":"local";throw lastErr||Error("api");
}

function jsonBlock(t){const s=String(t||"");let st=-1,d=0,q=!1,e=!1;for(let i=0;i<s.length;i++){const c=s[i];if(st<0){if(c==="{"){st=i;d=1}continue;}if(q){if(e)e=!1;else if(c==="\\")e=!0;else if(c==="\"")q=!1;continue;}if(c==="\""){q=!0;continue;}if(c==="{")d++;if(c==="}"){d--;if(!d)return s.slice(st,i+1);}}return"";}
function parseJson(t){const s=String(t||"").replace(/```json|```/gi,"").trim(),c=jsonBlock(s);for(const x of[s,c]){if(!x)continue;try{return JSON.parse(x);}catch(_){}}throw Error("json");}

/* ===== PRACTICE ===== */
function localPractice(){const useMl=isExamMalayalam(S.exam?.name);const ts=S.topic==="All Topics"?S.topics:[S.topic],p=qpool(ts,S.diff,useMl),qs=[];for(let i=0;i<5;i++)qs.push(cloneQ(p[(S.practice.seed+i)%p.length],i));S.practice.seed+=2;return{src:"local",qs};}

/* ===== MOCK ===== */
function localMock(){const p=presetFor(S.exam?.name);const useMl=isExamMalayalam(S.exam?.name);if(p){const secs=p.secs.map((s,si)=>{const ps=qpool(s[5],"",useMl);return{name:s[0],min:typeof s[1]==="string"?+s[1]:s[1],count:s[2],pc:s[3],pw:s[4],qs:Array.from({length:s[2]},(_,i)=>cloneQ(ps[(si*5+i)%Math.max(1,ps.length)],`${si}${i}`))};});return{title:p.label+" Official-Style Drill",inst:p.inst,nav:p.nav,total:p.total,secs};}const ts=examTopics(S.exam?.name),m=(a,b)=>qpool(ts.slice(a,b),"",useMl);return{title:tc(S.exam?.name)+" Adaptive Mock",inst:["Correct +1.","Wrong -0.25.","Adaptive fallback pattern."],nav:"free",total:45,secs:[{name:"Core Concepts",min:15,count:6,pc:1,pw:.25,qs:Array.from({length:6},(_,i)=>cloneQ(m(0,3)[i%Math.max(1,m(0,3).length)],`a${i}`))},{name:"Application",min:15,count:6,pc:1,pw:.25,qs:Array.from({length:6},(_,i)=>cloneQ(m(2,5)[i%Math.max(1,m(2,5).length)],`b${i}`))},{name:"Speed Recall",min:15,count:6,pc:1,pw:.25,qs:Array.from({length:6},(_,i)=>cloneQ(m(3,6)[i%Math.max(1,m(3,6).length)],`c${i}`))}]};}

function note(m){S.note=m;draw();clearTimeout(nt);nt=setTimeout(()=>{S.note=null;draw();},3200);}

/* ===== TRACK ===== */
function track(o){
  S.prog.a++;o.ok?(S.prog.c++,S.prog.st++,S.prog.best=Math.max(S.prog.best,S.prog.st)):(S.prog.w++,S.prog.st=0);
  S.prog.net=+(S.prog.net+(o.sc||0)).toFixed(2);S.prog.acc=S.prog.a?+((S.prog.c/S.prog.a)*100).toFixed(1):0;
  S.prog.t[o.t]??={a:0,c:0};S.prog.t[o.t].a++;if(o.ok)S.prog.t[o.t].c++;
  S.prog.d[o.d]??={a:0,c:0};S.prog.d[o.d].a++;if(o.ok)S.prog.d[o.d].c++;
  if(!o.skip){S.prog.feed.unshift({l:o.l,d:o.det,s:o.sc||0,t:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});S.prog.feed=S.prog.feed.slice(0,8);}
  // Save locally
  saveLocalProgress(S.exam?.n);
  // Queue for server sync
  queueEvent({t:o.t,d:o.d,ok:o.ok,sc:o.sc||0,l:o.l,det:o.det});
}

/* ===== EXAM LIFECYCLE ===== */
function activeExam(){return S.exam?.name||S.selectedExams[0]||""; }

function switchActiveExam(index){
  if(index<0||index>=S.selectedExams.length)return;
  S.activeExamIndex=index;
  const name=S.selectedExams[index];
  clearTimeout(lt);clearInterval(mt);
  const p=presetFor(name),ov=ovFallback(name,p);
  S.exam={name:tc(name),n:norm(name),src:p?"preset":"local",preset:p};
  S.ov=ov;S.topics=[...ov.syllabusTopics];S.tab="overview";S.topic="All Topics";S.diff="medium";
  S.practice={cache:{},cur:"",ans:{},seed:0};S.teach={open:{},cache:{}};
  S.chat=[{r:"assistant",t:"Ask any exam-aware doubt here. I'll help with "+tc(name)+"."}];
  S.prog={a:0,c:0,w:0,acc:0,net:0,st:0,best:0,t:{},d:{},feed:[]};
  S.mock={cfg:localMock(),run:null,res:null,h:[]};
  draw();
  const local=loadLocalProgress(S.exam.n);
  if(local){
    S.prog.a=local.a||0;S.prog.c=local.c||0;S.prog.w=local.w||0;
    S.prog.acc=local.acc||0;S.prog.net=local.net||0;S.prog.st=local.st||0;S.prog.best=local.best||0;
    S.prog.t=local.t||{};S.prog.d=local.d||{};S.prog.feed=local.feed||[];
    S.mock.h=local.mockH||[];
    draw();
  }
  loadOv(true);
}

async function startExam(selection){
  let exams=Array.isArray(selection)?selection:[selection];
  exams=exams.filter(Boolean);
  if(!exams.length)return note("Select at least one exam.");
  
  const name=exams[0]; 
  clearTimeout(lt);clearInterval(mt);
  const p=presetFor(name),ov=ovFallback(name,p);
  S.exam={name:tc(name),n:norm(name),src:p?"preset":"local",preset:p};
  S.ov=ov;S.topics=[...ov.syllabusTopics];S.tab="overview";S.topic="All Topics";S.diff="medium";
  S.screen="load";S.load=0;
  S.practice={cache:{},cur:"",ans:{},seed:0};S.teach={open:{},cache:{}};
  S.chat=[{r:"assistant",t:"Ask any exam-aware doubt here. I'll help with "+tc(name)+"."}];
  S.prog={a:0,c:0,w:0,acc:0,net:0,st:0,best:0,t:{},d:{},feed:[]};
  S.mock={cfg:localMock(),run:null,res:null,h:[]};
  sessionStorage.setItem(EXAM_KEY,JSON.stringify(exams));
  S.selectedExams=exams; draw();

  const id=++S.flow;
  // Load profile from server while loading animation plays
  const profilePromise=loadProfileFromServer();
  const tick=()=>{if(id!==S.flow)return;if(S.load<STEPS.length-1){S.load++;draw();lt=setTimeout(tick,600);}else{profilePromise.then(pd=>{if(pd)restoreProgressFromProfile(pd);S.screen="dash";draw();loadOv(true);}).catch(()=>{S.screen="dash";draw();loadOv(true);});}};
  lt=setTimeout(tick,600);
}

async function loadOv(force=false){if(S.ov&&S.exam.src===liveSource()&&!force)return;S.loadingOv=1;draw();const fb=ovFallback(S.exam.name,presetFor(S.exam.name));const langNote=isExamMalayalam(S.exam.name)?" Respond in Malayalam where appropriate.":"";try{const j=parseJson(await call("Return strict JSON only."+langNote,"Create an exam overview for '"+S.exam.name+"' using {\"examTitle\":\"\",\"difficulty\":\"\",\"patternSummary\":\"\",\"strategy\":[\"\"],\"timePlan\":[[\"phase\",\"duration\",\"focus\"]],\"syllabusTopics\":[\"\"]}. Keep it concise and exam-aware.",1100,.3));S.ov={examTitle:j.examTitle||fb.examTitle,difficulty:j.difficulty||fb.difficulty,patternSummary:j.patternSummary||fb.patternSummary,strategy:j.strategy?.length?j.strategy:fb.strategy,timePlan:j.timePlan?.length?j.timePlan:fb.timePlan,syllabusTopics:j.syllabusTopics?.length?j.syllabusTopics:fb.syllabusTopics,lang:fb.lang};S.topics=[...S.ov.syllabusTopics];S.exam.src=liveSource();}catch(e){S.ov=fb;S.topics=[...fb.syllabusTopics];if(e.message!=="nolive")note("Live overview failed. Local map active.");}S.loadingOv=0;draw();}

async function genPractice(force=false){const k=[S.exam.n,S.topic,S.diff].join("::");if(!force&&S.practice.cache[k]){S.practice.cur=k;draw();return;}S.loadingPr=1;draw();const fb=localPractice();const useMl=isExamMalayalam(S.exam.name);const langInst=useMl?" Generate questions in Malayalam language (Malayalam script). Options and explanation also in Malayalam.":"";try{const ts=S.topic==="All Topics"?S.topics.slice(0,4):[S.topic];const j=parseJson(await call("Return strict JSON only."+langInst,"Generate 5 MCQs for exam '"+S.exam.name+"' on '"+ts.join(", ")+"' at '"+S.diff+"' difficulty using {\"questions\":[{\"topic\":\"\",\"difficulty\":\"\",\"question\":\"\",\"options\":[\"\",\"\",\"\",\"\"],\"correctIndex\":0,\"explanation\":\"\",\"shortcutTrick\":\"\"}]}.",1200,.35));S.practice.cache[k]={src:liveSource(),qs:j.questions.slice(0,5).map((q,i)=>({id:`ai${Date.now()}${i}`,t:q.topic||ts[0],d:q.difficulty||S.diff,q:q.question,o:q.options?.length===4?q.options:fb.qs[i].o,a:Number(q.correctIndex)||0,e:q.explanation||"Compare options.","s":q.shortcutTick||"Use elimination.",lang:useMl?"ml":null}))};}catch(e){S.practice.cache[k]=fb;if(e.message!=="nolive")note("Live practice failed. Local batch loaded.");}S.practice.cur=k;S.loadingPr=0;draw();}

async function loadTeach(t){S.teach.open[t]=!S.teach.open[t];draw();if(!S.teach.open[t]||S.teach.cache[t])return;S.loadingTeach=t;draw();const langNote=isExamMalayalam(S.exam.name)?" Respond in Malayalam.":"";try{const j=parseJson(await call("Return strict JSON only."+langNote,"Teach '"+t+"' for '"+S.exam.name+"' using {\"summary\":\"\",\"key\":[\"\"],\"short\":[\"\"],\"example\":\"\",\"mist\":[\"\"]}."+langNote,900,.3));S.teach.cache[t]={summary:j.summary,key:j.key||guide(t).key,short:j.short||guide(t).short,example:j.example||guide(t).example,mist:j.mist||guide(t).mist};}catch(e){S.teach.cache[t]=guide(t);if(e.message!=="nolive")note("Live teaching failed. Local guide loaded.");}S.loadingTeach=null;draw();}

function replyLocal(m){const t=S.topic==="All Topics"?S.topics[0]||"General Awareness":S.topic,g=guide(t);return`**${t} focus for ${S.exam.name}**\n\n- Core idea: ${g.summary}\n- Fast method: ${g.short[0]}\n- Avoid this: ${g.mist[0]}\n- Apply it: ${m}`;}

async function sendChat(m){m=(m||"").trim();if(!m||S.sending)return;S.chat.push({r:"user",t:m});S.sending=1;draw();const langNote=isExamMalayalam(S.exam.name)?" Respond in Malayalam if the student asks in Malayalam, otherwise respond in English.":"";try{const txt=await call("You are ZenPrep AI. Reply concisely."+langNote,"Exam: "+S.exam.name+"\nTopic: "+S.topic+"\nRecent:\n"+S.chat.slice(-6).map(x=>x.r+": "+x.t).join("\n")+"\nReply with explanation, one shortcut, and one follow-up.",700,.45);S.chat.push({r:"assistant",t:txt||replyLocal(m)});}catch(e){S.chat.push({r:"assistant",t:replyLocal(m)});}S.sending=0;draw();}

function answerQ(id,ix){const b=S.practice.cache[S.practice.cur];if(!b||S.practice.ans[id])return;const q=b.qs.find(x=>x.id===id),ok=+ix===q.a;S.practice.ans[id]={s:+ix,ok};track({t:q.t,d:q.d,ok,sc:ok?1:0,l:"Practice question",det:`${q.t} · ${ok?"correct":"incorrect"}`});draw();}

function curBatch(){return S.practice.cache[S.practice.cur];}

function startMock(){
  const c=S.mock.cfg;
  if(!c||!c.secs||!c.secs.length)return note("Mock config error");
  const o=[];
  c.secs.forEach((s,si)=>s.qs.forEach((q,qi)=>o.push({si,qi,id:q.id})));
  if(!o.length)return note("No questions in mock");
  S.mock.run={c,o,i:0,sec:0,ans:{},flag:{},tl:c.total*60,sl:c.secs[0].min*60};
  S.mock.res=null;
  clearInterval(mt);
  mt=setInterval(()=>{
    const r=S.mock.run;
    if(!r){clearInterval(mt);return;}
    r.tl=Math.max(0,r.tl-1);
    if(r.tl<=0){clearInterval(mt);submitMock(true);return;}
    if(r.c.nav==="locked"){
      r.sl=Math.max(0,r.sl-1);
      if(r.sl<=0){
        if(r.sec<r.c.secs.length-1){
          r.sec++;
          r.sl=r.c.secs[r.sec].min*60;
          r.i=r.o.findIndex(x=>x.si===r.sec);
          if(r.i<0)r.i=0;
        }else{
          clearInterval(mt);
          submitMock(true);
          return;
        }
      }
    }
    draw();
  },1000);
  draw();
}

function curMock(){
  const r=S.mock.run;
  if(!r)return null;
  const p=r.o[r.i];
  if(!p)return null;
  const s=r.c.secs[p.si];
  const q=s.qs[p.qi];
  return{p,s,q};
}

function jump(i){
  const r=S.mock.run;
  if(!r)return;
  const n=Math.max(0,Math.min(i,r.o.length-1));
  r.i=n;
  const p=r.o[n];
  if(p)r.sec=p.si;
  draw();
}

function nextSec(){
  const r=S.mock.run;
  if(!r)return;
  if(r.sec<r.c.secs.length-1){
    r.sec++;
    r.sl=r.c.secs[r.sec].min*60;
    r.i=r.o.findIndex(x=>x.si===r.sec);
    if(r.i<0)r.i=0;
    draw();
  }else{
    submitMock(false);
  }
}

function submitMock(auto){
  const r=S.mock.run;
  if(!r){
    S.mock.res={a:0,c:0,w:0,u:0,sc:0,max:0,acc:0,secs:[]};
    draw();
    return;
  }
  clearInterval(mt);
  if(!auto&&!confirm("Submit the mock test? Unanswered questions will be marked as unattempted."))return;
  
  const res={a:0,c:0,w:0,u:0,sc:0,max:0,acc:0,secs:[]};
  const mockEvents=[];
  r.c.secs.forEach(s=>{
    const sr={n:s.name,a:0,c:0,w:0,sc:0,u:0};
    s.qs.forEach(q=>{
      const at=q.id in r.ans;
      const ok=at&&r.ans[q.id]===q.a;
      res.max+=s.pc;
      if(at){
        res.a++;sr.a++;
        if(ok){res.c++;sr.c++;res.sc+=s.pc;sr.sc+=s.pc;}
        else{res.w++;sr.w++;res.sc-=s.pw;sr.sc-=s.pw;}
        const ev={t:q.t,d:q.d,ok,sc:ok?s.pc:-s.pw,l:"Mock test",det:`${s.name} · ${q.t}`};
        track({...ev,skip:1});
        mockEvents.push(ev);
      }else{
        res.u++;sr.u++;
      }
    });
    res.secs.push(sr);
  });
  res.u=r.o.length-res.a;
  res.acc=res.a?+((res.c/res.a)*100).toFixed(1):0;
  S.prog.feed.unshift({l:"Mock submitted",d:`${res.c} correct · ${res.w} wrong · ${res.u} unattempted`,s:res.sc,t:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
  S.prog.feed=S.prog.feed.slice(0,8);
  S.mock.h.unshift({t:r.c.title,s:money(res.sc),a:res.acc,tm:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
  S.mock.h=S.mock.h.slice(0,4);
  saveLocalProgress(S.exam?.n);
  syncMockToServer({title:r.c.title,score:+money(res.sc),accuracy:res.acc,correct:res.c,wrong:res.w,unattempted:res.u,sections:res.secs},mockEvents,S.exam?.n).catch(()=>{});
  S.mock.res=res;
  S.mock.run=null;
  draw();
}

function md(t){const safe=esc(t||"");return safe.split("\n").map(x=>x.startsWith("- ")?`<li>${x.slice(2).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}</li>`:`<p>${x.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}</p>`).join("").replace(/(<li>.*<\/li>)/s,"<ul class='list'>$1</ul>");}

/* ===== ADMIN ===== */
async function loadAdmin(code){
  S.adminLoading=true;draw();
  try{
    const r=await fetch(ADMIN_API+"?code="+encodeURIComponent(code));
    const d=await r.json().catch(()=>null);
    if(r.ok&&d){S.adminData=d;S.screen="admin";}
    else{note(d?.error||"Admin access denied.");}
  }catch(e){note("Failed to load admin panel.");}
  S.adminLoading=false;draw();
}
