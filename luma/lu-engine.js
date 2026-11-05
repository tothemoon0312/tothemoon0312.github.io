/* Lu's conversation engine: turns free-form chat into an investing profile and ranks matches.
   Runs entirely in the browser (rule-based, no external AI calls). Exposes globals used by index.html. */
'use strict';
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ================= Universe ================= */
// [ticker, name, color, risk 1-5, dividend?, cap, themes, aliases, blurb]
const RAW = [
  ['NVDA','NVIDIA','#76b900',4,false,'Mega',['ai','semis','bigtech','gaming'],['nvidia','gpu','gpus','graphics card'],'Makes the GPUs that power most AI training and gaming rigs.'],
  ['AMD','Advanced Micro Devices','#ed1c24',4,false,'Large',['ai','semis','gaming'],['amd','ryzen','radeon'],'CPUs and GPUs competing head-on with Intel and NVIDIA.'],
  ['TSM','Taiwan Semiconductor','#c8102e',3,true,'Mega',['semis','ai'],['tsmc','taiwan semi'],'Manufactures chips for Apple, NVIDIA, AMD and more.'],
  ['AVGO','Broadcom','#cc092f',3,true,'Mega',['semis','ai'],['broadcom'],'Networking chips and infrastructure software; pays a dividend.'],
  ['ASML','ASML Holding','#10069f',3,true,'Mega',['semis'],['asml'],'The only maker of the EUV machines needed for cutting-edge chips.'],
  ['INTC','Intel','#0068b5',4,false,'Large',['semis','turnaround'],['intel'],'Legacy chip giant attempting a manufacturing comeback.'],
  ['MSFT','Microsoft','#00a4ef',2,true,'Mega',['ai','cloud','bigtech','gaming'],['microsoft','windows','xbox','azure','office','openai','copilot'],'Windows, Office, Azure cloud and Xbox, with a big AI push.'],
  ['GOOGL','Alphabet','#4285f4',3,false,'Mega',['ai','cloud','bigtech','social'],['google','alphabet','youtube','android','gemini','waymo'],'Google Search, YouTube, Android and Google Cloud.'],
  ['META','Meta Platforms','#0866ff',3,true,'Mega',['social','ai','bigtech'],['meta','facebook','instagram','whatsapp','threads','oculus'],'Facebook, Instagram and WhatsApp, investing heavily in AI and VR.'],
  ['AAPL','Apple','#555555',2,true,'Mega',['bigtech','consumer'],['apple','iphone','ipad','mac','macbook','airpods','apple watch'],'iPhone, Mac and a fast-growing services business.'],
  ['AMZN','Amazon','#ff9900',3,false,'Mega',['cloud','retail','bigtech','ai'],['amazon','aws','prime','alexa'],'E-commerce giant and owner of AWS, the largest cloud platform.'],
  ['ORCL','Oracle','#c74634',3,true,'Mega',['cloud','ai'],['oracle'],'Enterprise databases, now a fast-growing AI cloud provider.'],
  ['CRM','Salesforce','#00a1e0',3,true,'Large',['cloud','software'],['salesforce','slack'],'Leading customer-relationship software, plus Slack.'],
  ['ADBE','Adobe','#fa0f00',3,false,'Large',['software','creative','ai'],['adobe','photoshop','premiere','illustrator','lightroom'],'Photoshop, Premiere and the Creative Cloud suite.'],
  ['PLTR','Palantir','#101113',5,false,'Large',['ai','software','defense'],['palantir'],'Data and AI software for governments and enterprises.'],
  ['SNOW','Snowflake','#29b5e8',5,false,'Mid',['cloud','software','ai'],['snowflake'],'Cloud data platform used by thousands of companies.'],
  ['NET','Cloudflare','#f38020',5,false,'Mid',['cloud','cyber'],['cloudflare'],'Keeps a large share of websites fast and secure.'],
  ['CRWD','CrowdStrike','#e01f26',4,false,'Large',['cyber','software'],['crowdstrike'],'Cloud-native cybersecurity protecting endpoints.'],
  ['PANW','Palo Alto Networks','#fa582d',3,false,'Large',['cyber','software'],['palo alto'],'One of the largest pure-play cybersecurity companies.'],
  ['TSLA','Tesla','#cc0000',5,false,'Mega',['ev','clean','ai','robotics'],['tesla','elon','musk','model 3','model y','cybertruck','optimus'],'EVs, batteries, energy storage and robotaxi ambitions.'],
  ['RIVN','Rivian','#f5a623',5,false,'Mid',['ev'],['rivian'],'Electric trucks, SUVs and delivery vans.'],
  ['F','Ford','#003478',3,true,'Large',['ev','auto'],['ford','f-150','mustang'],'Classic automaker building out its EV lineup.'],
  ['GM','General Motors','#0170ce',3,true,'Large',['ev','auto'],['general motors','chevy','chevrolet','cadillac'],'Chevy, GMC and Cadillac, plus Cruise and EV investments.'],
  ['ENPH','Enphase Energy','#f37321',5,false,'Mid',['clean','solar'],['enphase'],'Microinverters that power home solar systems.'],
  ['FSLR','First Solar','#e2231a',4,false,'Mid',['clean','solar'],['first solar'],'The largest US maker of solar panels.'],
  ['NEE','NextEra Energy','#0066b3',2,true,'Large',['clean','utilities','dividends'],['nextera','florida power'],'The biggest wind and solar generator in the US.'],
  ['PLUG','Plug Power','#00a4e4',5,false,'Small',['clean','hydrogen'],['plug power','hydrogen'],'Hydrogen fuel cells: a high-risk clean-energy bet.'],
  ['XOM','ExxonMobil','#ed1b2d',2,true,'Mega',['oil','energy','dividends'],['exxon','exxonmobil','mobil'],'Oil and gas major with a long dividend history.'],
  ['CVX','Chevron','#0054a4',2,true,'Mega',['oil','energy','dividends'],['chevron'],'Integrated oil company known for steady dividends.'],
  ['NKE','Nike','#111111',3,true,'Large',['consumer','fashion','sports'],['nike','jordan','air max','sneakers'],'The world\'s biggest athletic brand.'],
  ['LULU','Lululemon','#d31f32',4,false,'Mid',['consumer','fashion','sports'],['lululemon','lulu','yoga'],'Premium athleisure, expanding globally.'],
  ['SBUX','Starbucks','#00704a',3,true,'Large',['consumer','food'],['starbucks','coffee'],'The global coffee chain on almost every corner.'],
  ['MCD','McDonald\'s','#ffc72c',1,true,'Large',['consumer','food','dividends'],['mcdonalds','mcdonald','big mac','fast food'],'Fast-food icon and a steady dividend grower.'],
  ['CMG','Chipotle','#a81612',3,false,'Large',['consumer','food'],['chipotle','burrito'],'Fast-casual Mexican chain with strong growth.'],
  ['KO','Coca-Cola','#f40009',1,true,'Mega',['consumer','food','dividends'],['coca-cola','coca cola','coke','soda'],'Beverage giant, a dividend payer for decades.'],
  ['PEP','PepsiCo','#004b93',1,true,'Mega',['consumer','food','dividends'],['pepsi','pepsico','doritos','lays','gatorade'],'Pepsi, plus snacks like Doritos and Lay\'s.'],
  ['COST','Costco','#e31837',2,true,'Mega',['retail','consumer'],['costco'],'Membership warehouse club with very loyal customers.'],
  ['WMT','Walmart','#0071ce',1,true,'Mega',['retail','consumer','dividends'],['walmart'],'America\'s largest retailer, growing in e-commerce.'],
  ['TGT','Target','#cc0000',3,true,'Large',['retail','consumer'],['target'],'Big-box retailer with strong private-label brands.'],
  ['DIS','Disney','#113ccf',3,false,'Large',['entertainment','streaming'],['disney','marvel','pixar','star wars','espn','hulu'],'Theme parks, Marvel, Pixar, ESPN and Disney+.'],
  ['NFLX','Netflix','#e50914',4,false,'Mega',['streaming','entertainment'],['netflix'],'The world\'s largest paid streaming service.'],
  ['SPOT','Spotify','#1db954',4,false,'Large',['streaming','music'],['spotify','podcast','podcasts'],'The leading music and podcast streaming platform.'],
  ['RBLX','Roblox','#000000',5,false,'Mid',['gaming','social'],['roblox'],'User-created gaming platform popular with young players.'],
  ['EA','Electronic Arts','#ff4747',3,false,'Large',['gaming'],['electronic arts','fifa','ea sports','madden','sims','apex'],'EA Sports FC, Madden, The Sims and Apex Legends.'],
  ['TTWO','Take-Two Interactive','#2b2b2b',4,false,'Large',['gaming'],['take-two','take two','gta','grand theft auto','rockstar','nba 2k'],'Owner of Rockstar Games (GTA) and NBA 2K.'],
  ['JNJ','Johnson & Johnson','#d51900',1,true,'Mega',['health','pharma','dividends'],['johnson & johnson','johnson and johnson','j&j','tylenol','band-aid'],'Diversified healthcare giant with decades of dividend growth.'],
  ['LLY','Eli Lilly','#d52b1e',3,true,'Mega',['health','pharma','weightloss'],['eli lilly','lilly','mounjaro','zepbound'],'Pharma leader behind blockbuster weight-loss drugs.'],
  ['NVO','Novo Nordisk','#001965',3,true,'Mega',['health','pharma','weightloss'],['novo','ozempic','wegovy'],'Maker of Ozempic and Wegovy.'],
  ['PFE','Pfizer','#0093d0',2,true,'Large',['health','pharma','dividends'],['pfizer'],'Big pharma with a high dividend yield.'],
  ['UNH','UnitedHealth','#002677',2,true,'Mega',['health','insurance'],['unitedhealth','united healthcare','optum'],'The largest US health insurer.'],
  ['ISRG','Intuitive Surgical','#0072ce',3,false,'Large',['health','robotics','medtech'],['intuitive','da vinci','surgical robot'],'Da Vinci surgical robots used in hospitals worldwide.'],
  ['MRNA','Moderna','#c8102e',5,false,'Mid',['health','biotech'],['moderna','mrna'],'mRNA biotech working on vaccines and cancer treatments.'],
  ['JPM','JPMorgan Chase','#117aca',2,true,'Mega',['banks','dividends'],['jpmorgan','jp morgan','chase'],'The largest US bank.'],
  ['BAC','Bank of America','#e31837',3,true,'Mega',['banks'],['bank of america','bofa'],'Major consumer and investment bank.'],
  ['GS','Goldman Sachs','#7399c6',3,true,'Large',['banks'],['goldman','goldman sachs'],'Top investment bank and trading house.'],
  ['V','Visa','#1a1f71',2,true,'Mega',['payments','fintech'],['visa'],'The world\'s biggest card payments network.'],
  ['MA','Mastercard','#eb001b',2,true,'Mega',['payments','fintech'],['mastercard'],'Global payments network, Visa\'s main rival.'],
  ['PYPL','PayPal','#003087',4,false,'Large',['payments','fintech'],['paypal','venmo'],'PayPal and Venmo digital payments.'],
  ['XYZ','Block','#000000',5,false,'Mid',['payments','fintech','crypto'],['block','square','cash app','cashapp'],'Square for merchants and Cash App for consumers.'],
  ['SOFI','SoFi Technologies','#00a2c7',5,false,'Mid',['fintech','banks'],['sofi'],'Digital bank for student loans, investing and banking.'],
  ['HOOD','Robinhood','#00c805',5,false,'Mid',['fintech','crypto'],['robinhood'],'Commission-free trading app for stocks and crypto.'],
  ['COIN','Coinbase','#0052ff',5,false,'Large',['crypto','fintech'],['coinbase','bitcoin','btc','ethereum','eth'],'The largest US crypto exchange.'],
  ['MSTR','Strategy (MicroStrategy)','#d9232e',5,false,'Mid',['crypto'],['microstrategy','saylor'],'Software firm holding a huge bitcoin treasury.'],
  ['UBER','Uber','#000000',3,false,'Large',['travel','gig'],['uber','uber eats'],'Rides, food delivery and freight, now profitable.'],
  ['ABNB','Airbnb','#ff5a5f',4,false,'Large',['travel'],['airbnb'],'Short-term rentals in nearly every country.'],
  ['BKNG','Booking Holdings','#003580',3,false,'Mega',['travel'],['booking.com','priceline','kayak','opentable'],'Booking.com, Priceline, Kayak and OpenTable.'],
  ['DAL','Delta Air Lines','#e01933',4,true,'Mid',['travel','airlines'],['delta','airline','airlines','flights'],'Premium US airline, sensitive to the economy.'],
  ['LMT','Lockheed Martin','#00205b',2,true,'Large',['defense','space','dividends'],['lockheed','f-35'],'Defense contractor behind the F-35 fighter.'],
  ['RKLB','Rocket Lab','#000000',5,false,'Mid',['space'],['rocket lab','rockets','rocket'],'Small-satellite launcher building a bigger rocket.'],
  ['O','Realty Income','#1f4e79',1,true,'Large',['reits','dividends','realestate'],['realty income','monthly dividend'],'Real-estate trust that pays a dividend every month.'],
  ['DUK','Duke Energy','#00a3e0',1,true,'Large',['utilities','dividends'],['duke energy'],'Regulated utility with dependable income.'],
  ['MO','Altria','#0f3f7a',2,true,'Large',['tobacco','dividends'],['altria','marlboro'],'Tobacco company with one of the highest dividend yields.'],
  ['PM','Philip Morris','#0d2c6c',2,true,'Large',['tobacco','dividends'],['philip morris','iqos','zyn'],'Global tobacco shifting to smoke-free products like ZYN.'],
  ['VTI','Vanguard Total Stock Market ETF','#96151d',2,true,'ETF',['index','beginner'],['vti','total market','total stock market'],'The entire US stock market in one low-fee fund. A classic first investment.'],
  ['VOO','Vanguard S&P 500 ETF','#96151d',2,true,'ETF',['index','beginner'],['s&p','s&p 500','sp500','index fund','vanguard'],'Owns all 500 S&P companies in one low-cost fund.'],
  ['QQQ','Invesco QQQ ETF','#2c3e8f',3,false,'ETF',['index','bigtech','beginner'],['nasdaq','nasdaq 100','qqq'],'Tracks the Nasdaq-100, heavy in big tech.'],
  ['SCHD','Schwab US Dividend ETF','#00a0df',1,true,'ETF',['index','dividends','beginner'],['schd','dividend etf'],'A basket of quality US dividend payers.']
];
const STOCKS = RAW.map(r => ({ t:r[0], name:r[1], color:r[2], risk:r[3], div:r[4], cap:r[5], themes:r[6], aliases:r[7], blurb:r[8] }));
const BY_T = Object.fromEntries(STOCKS.map(s => [s.t, s]));

/* ================= Theme vocabulary ================= */
const THEMES = {
  ai:        { label:'AI', words:['ai','a.i.','artificial intelligence','machine learning','chatgpt','llm','llms','gen ai','generative'] },
  semis:     { label:'Chips', words:['chip','chips','semiconductor','semiconductors','semis','processor','processors'] },
  cloud:     { label:'Cloud', words:['cloud','saas','data center','data centers','datacenter'] },
  software:  { label:'Software', words:['software','apps','enterprise software'] },
  cyber:     { label:'Cybersecurity', words:['cyber','cybersecurity','security','hacking','hackers'] },
  bigtech:   { label:'Big tech', words:['big tech','tech','technology','faang','magnificent 7','mag 7','mag7'] },
  ev:        { label:'EVs', words:['ev','evs','electric vehicle','electric vehicles','electric car','electric cars'] },
  auto:      { label:'Cars', words:['car','cars','auto','autos','automaker','trucks'] },
  clean:     { label:'Clean energy', words:['clean energy','green','renewable','renewables','climate','sustainable','sustainability','esg','environment','planet'] },
  solar:     { label:'Solar', words:['solar','solar panels'] },
  oil:       { label:'Oil & gas', words:['oil','gas','fossil','fossil fuels','petroleum','drilling'] },
  energy:    { label:'Energy', words:['energy'] },
  consumer:  { label:'Everyday brands', words:['brands','everyday','things i use','stuff i buy','consumer'] },
  food:      { label:'Food & drink', words:['food','restaurant','restaurants','drinks','snacks','coffee','eat','eating'] },
  retail:    { label:'Retail', words:['retail','shopping','shop','stores','store'] },
  fashion:   { label:'Fashion', words:['fashion','clothes','clothing','apparel','style'] },
  sports:    { label:'Sports', words:['sports','gym','fitness','workout','running','athlete'] },
  streaming: { label:'Streaming', words:['streaming','stream','shows','tv','movies'] },
  entertainment:{ label:'Entertainment', words:['entertainment','media','theme parks'] },
  music:     { label:'Music', words:['music','songs','concerts'] },
  gaming:    { label:'Gaming', words:['gaming','games','gamer','video games','videogames','esports','console'] },
  social:    { label:'Social media', words:['social media','social','tiktok','influencer'] },
  health:    { label:'Healthcare', words:['health','healthcare','health care','medical','medicine','hospital','hospitals'] },
  pharma:    { label:'Pharma', words:['pharma','pharmaceutical','drugs','drug'] },
  biotech:   { label:'Biotech', words:['biotech','biotechnology','vaccine','vaccines','genetics'] },
  weightloss:{ label:'Weight-loss drugs', words:['weight loss','weight-loss','glp-1','glp1'] },
  medtech:   { label:'Medtech', words:['medtech','medical devices'] },
  robotics:  { label:'Robotics', words:['robot','robots','robotics','automation','humanoid'] },
  banks:     { label:'Banks', words:['bank','banks','banking','finance','financials','wall street'] },
  fintech:   { label:'Fintech', words:['fintech','neobank','trading app','finance apps'] },
  payments:  { label:'Payments', words:['payments','credit card','credit cards','cashless'] },
  crypto:    { label:'Crypto', words:['crypto','cryptocurrency','blockchain','web3','defi','bitcoin','btc','ethereum'] },
  travel:    { label:'Travel', words:['travel','traveling','travelling','vacation','vacations','trips','hotels'] },
  airlines:  { label:'Airlines', words:['airline','airlines','flying','planes'] },
  space:     { label:'Space', words:['space','rockets','satellites','satellite','nasa','spacex'] },
  defense:   { label:'Defense', words:['defense','defence','military','weapons','aerospace'] },
  dividends: { label:'Dividends', words:['dividend','dividends','passive income','income','yield','cash flow'] },
  reits:     { label:'Real estate', words:['reit','reits','real estate','property','landlord'] },
  realestate:{ label:'Real estate', words:[] },
  utilities: { label:'Utilities', words:['utility','utilities','electricity'] },
  tobacco:   { label:'Tobacco', words:['tobacco','cigarettes','smoking','nicotine','vape','vaping'] },
  index:     { label:'Index funds', words:['index','etf','etfs','diversified','diversify','whole market','s&p'] },
  beginner:  { label:'Beginner-friendly', words:['beginner','new to investing','first time','just starting','no idea','dont know much','don\'t know much','newbie'] },
  hydrogen:  { label:'Hydrogen', words:['hydrogen','fuel cell'] },
  creative:  { label:'Creative tools', words:['design','designer','creative','photography','video editing'] },
  insurance: { label:'Insurance', words:['insurance'] },
  turnaround:{ label:'Comebacks', words:['turnaround','comeback','underdog','beaten down','undervalued','cheap stocks'] },
  gig:       { label:'Gig economy', words:['gig','rideshare','delivery'] }
};

const RISK_LOW = ['safe','safer','safety','stable','steady','conservative','retire','retirement','retiring','sleep at night','low risk','low-risk','protect','careful','cautious','nervous','scared','afraid','worried','preserve','boring','blue chip','blue-chip','don\'t want to lose','dont want to lose','can\'t afford to lose','cant afford to lose','emergency fund','kids','college fund','reliable','defensive'];
const RISK_HIGH = ['crazy','wild','insane','nuts','swing big','big swings','risk it','aggressive','yolo','moon','to the moon','high risk','high-risk','risky','volatile','volatility','gamble','gambling','10x','100x','rocket','moonshot','fast money','quick money','get rich','growth','high growth','hypergrowth','all in','young','speculative','lottery','swing for','big gains','huge gains','multibagger','disrupt','disruptive'];
const RISK_MID = ['balanced','moderate','middle','mix','bit of both','some risk','medium risk','medium'];
const NEG = /\b(no|not|don'?t|do not|never|avoid|avoiding|hate|hates|dislike|without|except|stay away|skip|less|ban|exclude|nothing|none|anti|against|boycott|won'?t|wouldn'?t|isn'?t|aren'?t|sick of|tired of|enough)\b/;
const MORE_LIKE = /\b(more like|similar to|like)\s+\$?([a-z.&' -]{2,30})/i;
const TICKER_STOP = new Set(['I','A','AN','AM','IT','IS','OR','ON','SO','BE','GO','DO','UP','ME','MY','NO','OK','AI','EV','EVS','ETF','US','USA','CEO','IPO','TV','PC','THE','AND','FOR','YOLO','LOL','IMO','TBH','BTW','O','F','V','MA','PM','MO','GS','GM','EA','NET','DAL','DUK','COST','HOOD','DIS','LOW']);

/* ================= State ================= */
const blank = () => ({
  weights: {},      // theme -> number
  excluded: [],     // themes
  mentions: [],     // tickers user talked about positively
  banned: [],       // tickers user rejected in chat
  risk: null,       // 1..5 inferred, null = unknown
  riskSignals: 0,
  income: false,
  swiped: {},       // ticker -> 'like'|'nope'|'star'
  history: [],      // undo stack of tickers
  log: [],          // chat transcript [{who, text}]
  turns: 0
});
let S = load() || blank();

function load() {
  try { const raw = localStorage.getItem('luma.v2'); return raw ? Object.assign(blank(), JSON.parse(raw)) : null; }
  catch (e) { return null; }
}
function save() { try { localStorage.setItem('luma.v2', JSON.stringify(S)); } catch (e) {} }

/* ================= Text understanding ================= */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasPhrase = (text, phrase) => new RegExp('(^|[^a-z0-9])' + esc(phrase) + '($|[^a-z0-9])').test(text);

function clauses(text) {
  // Split on punctuation and contrastive words so "I like AI but hate crypto" is two clauses.
  return text.split(/[.;!?\n]+|,\s*(?=but|though|however|although|except)|\b(?:but|though|however|although|whereas)\b/i)
             .map(c => c && c.trim()).filter(Boolean);
}

const POSTNEG = /\b(no|nope|no thanks|not for me|pass|never|yuck|ew|nah|please no)\W*$/;
const POS = /\b(like|love|into|want|interested|yes|yeah|prefer|enjoy|fan|obsessed|excited|curious|i'?m)\b/;
// A clause like "I don't like banks, crypto, or oil" is split into comma segments; a negation
// carries forward into following segments until a positive word ("I'm into...") resets it.
function isNegated(seg, phrase, carry) {
  if (POSTNEG.test(seg)) return true;
  const idx = seg.search(new RegExp('(^|[^a-z0-9])' + esc(phrase)));
  if (idx < 0) return false;
  const before = seg.slice(Math.max(0, idx - 40), idx + 1);
  if (NEG.test(before)) return true;
  return carry && !POS.test(before);
}
function segments(clause) { return clause.split(/,|\/|\s+&\s+/).map(x => x.trim()).filter(Boolean); }

function findStocks(clauseRaw, clauseLow) {
  const hits = new Set();
  // explicit tickers: $NVDA anywhere, or ALL-CAPS word that is a ticker and not a common word
  (clauseRaw.match(/\$[A-Za-z]{1,5}\b/g) || []).forEach(m => { const t = m.slice(1).toUpperCase(); if (BY_T[t]) hits.add(t); });
  (clauseRaw.match(/\b[A-Z]{2,5}\b/g) || []).forEach(t => { if (BY_T[t] && !TICKER_STOP.has(t)) hits.add(t); });
  // names & products
  for (const s of STOCKS) {
    for (const a of s.aliases) { if (hasPhrase(clauseLow, a)) { hits.add(s.t); break; } }
  }
  return [...hits];
}

function understand(raw) {
  const found = { likes: [], dislikes: [], stocksUp: [], stocksDown: [], riskDelta: 0, riskWords: [], income: false, moreLike: null, wantsDeck: false, wantsLess: null };
  const low = raw.toLowerCase().replace(/[’']/g, '\'');

  if (/\b(show|build|make|start|let'?s go|ready|swipe|deck|matches|go)\b/.test(low) && low.length < 40) found.wantsDeck = true;

  for (const clauseRaw of clauses(raw)) {
   let carry = false;
   for (const cRaw of segments(clauseRaw)) {
    const c = cRaw.toLowerCase().replace(/[’']/g, '\'');
    let negHere = false;
    const neg = w => { const n = isNegated(c, w, carry); if (n) negHere = true; return n; };
    const spans = [];

    // "more like X"
    const ml = c.match(MORE_LIKE);
    if (ml && /\b(more|similar)\b/.test(c)) {
      const target = findStocks(ml[2].toUpperCase(), ml[2].toLowerCase())[0];
      if (target) found.moreLike = target;
    }

    // themes
    // longest phrases first so "clean energy" doesn't also count as plain "energy"
    const cands = [];
    for (const [key, th] of Object.entries(THEMES)) for (const w of th.words) cands.push([key, w]);
    cands.sort((a, b) => b[1].length - a[1].length);
    const seen = new Set();
    for (const [key, w] of cands) {
      if (seen.has(key)) continue;
      const m = new RegExp('(^|[^a-z0-9])(' + esc(w) + ')($|[^a-z0-9])').exec(c);
      if (!m) continue;
      const st = m.index + m[1].length, en = st + w.length;
      if (spans.some(([a, b]) => st < b && en > a)) continue;
      spans.push([st, en]); seen.add(key);
      if (neg(w)) found.dislikes.push(key); else found.likes.push(key);
    }

    // stocks
    for (const t of findStocks(cRaw, c)) {
      const s = BY_T[t];
      const negated = s.aliases.concat([t.toLowerCase()]).some(a => hasPhrase(c, a) && neg(a));
      (negated ? found.stocksDown : found.stocksUp).push(t);
    }

    // risk tone
    const lowHits = RISK_LOW.filter(w => hasPhrase(c, w));
    const highHits = RISK_HIGH.filter(w => hasPhrase(c, w));
    const midHits = RISK_MID.filter(w => hasPhrase(c, w));
    // "not too risky", "don't want anything volatile" flip high words to low
    highHits.forEach(w => { if (neg(w)) { found.riskDelta -= 1.2; found.riskWords.push('low'); } else { found.riskDelta += 1.2; found.riskWords.push('high'); } });
    lowHits.forEach(w => { if (!/lose/.test(w) && neg(w)) { found.riskDelta += 0.8; found.riskWords.push('high'); } else { found.riskDelta -= 1; found.riskWords.push('low'); } });
    if (midHits.length) { found.riskWords.push('mid'); found.riskDelta += 0; found.mid = true; }
    if (!highHits.length && /\b(less|lower|reduce|tone down)\b.*\b(risk|risky|volatile|crazy|wild)\b/.test(c)) { found.riskDelta -= 1.2; found.riskWords.push('low'); }
    if (!highHits.length && /\b(more|higher|crank up|spicier|spicy)\b.*\b(risk|risky|aggressive|volatile)\b/.test(c)) { found.riskDelta += 1.2; found.riskWords.push('high'); }
    if (/\b(retire|retirement)\b/.test(c) && /\b(in|within)\s+\d+\s+years?\b/.test(c)) {
      const yrs = +c.match(/\d+/)[0]; found.riskDelta += yrs >= 25 ? 1.5 : yrs <= 10 ? -1 : 0;
    }
    const age = c.match(/\b(i'?m|i am|age)\s*(\d{2})\b/);
    if (age) { const a = +age[2]; if (a >= 16 && a <= 90) found.riskDelta += a < 30 ? 0.8 : a > 55 ? -1 : 0; }
    if (THEMES.dividends.words.some(w => hasPhrase(c, w)) && !found.dislikes.includes('dividends')) found.income = true;
    carry = negHere && !POS.test(c.replace(/\b(don'?t|do not|not)\s+(like|love|want)\b/g, ''));
   }
  }

  // dedupe; a theme explicitly disliked wins over a like in the same message
  found.dislikes = [...new Set(found.dislikes)];
  found.likes = [...new Set(found.likes)].filter(k => !found.dislikes.includes(k));
  found.stocksDown = [...new Set(found.stocksDown)];
  found.stocksUp = [...new Set(found.stocksUp)].filter(t => !found.stocksDown.includes(t));
  // stocks named directly shouldn't also add theme noise like "energy" from "Duke Energy"
  if (found.stocksUp.length && found.likes.includes('energy') && found.stocksUp.some(t => /energy/i.test(BY_T[t].name))) found.likes = found.likes.filter(k => k !== 'energy');
  return found;
}

function apply(f) {
  const changes = { likes: [], dislikes: [], up: [], down: [], riskBefore: S.risk };
  for (const k of f.likes) {
    S.weights[k] = (S.weights[k] || 0) + 2;
    if (S.excluded.includes(k)) S.excluded = S.excluded.filter(x => x !== k);
    changes.likes.push(k);
  }
  for (const k of f.dislikes) {
    if (!S.excluded.includes(k)) S.excluded.push(k);
    delete S.weights[k];
    changes.dislikes.push(k);
  }
  for (const t of f.stocksUp) {
    if (!S.mentions.includes(t)) S.mentions.push(t);
    S.banned = S.banned.filter(x => x !== t);
    delete S.swiped[t];
    BY_T[t].themes.forEach(k => { if (!S.excluded.includes(k)) S.weights[k] = (S.weights[k] || 0) + 0.75; });
    changes.up.push(t);
  }
  for (const t of f.stocksDown) {
    if (!S.banned.includes(t)) S.banned.push(t);
    S.mentions = S.mentions.filter(x => x !== t);
    changes.down.push(t);
  }
  if (f.moreLike) {
    BY_T[f.moreLike].themes.forEach(k => { S.weights[k] = (S.weights[k] || 0) + 1.5; });
    if (S.risk == null) S.risk = BY_T[f.moreLike].risk;
  }
  if (f.riskDelta || f.mid) {
    const base = S.risk == null ? 3 : S.risk;
    S.risk = Math.max(1, Math.min(5, base + f.riskDelta));
    S.riskSignals++;
  }
  if (f.income) S.income = true;
  if (f.dislikes.includes('dividends')) S.income = false;
  return changes;
}

/* ================= Recommendation ================= */
function score(s) {
  if (S.banned.includes(s.t)) return -Infinity;
  if (s.themes.some(k => S.excluded.includes(k))) return -Infinity;
  let sc = 0; const why = [];
  if (S.mentions.includes(s.t)) { sc += 12; why.push('You mentioned it'); }
  const matched = s.themes.filter(k => S.weights[k] > 0).sort((a, b) => S.weights[b] - S.weights[a]);
  matched.forEach(k => sc += S.weights[k] * 1.6);
  matched.slice(0, 2).forEach(k => why.push(THEMES[k].label));
  if (S.risk != null) {
    const gap = Math.abs(s.risk - S.risk);
    sc += (2 - gap) * 1.8;
    if (gap < 1) why.push(S.risk <= 2 ? 'Fits a steady style' : S.risk >= 4 ? 'Fits your appetite for risk' : 'Balanced risk');
  }
  if (S.income && s.div) { sc += 2.5; if (!matched.includes('dividends')) why.push('Pays a dividend'); }
  // tiny deterministic jitter to keep decks from feeling identical
  sc += (hash(s.t) % 100) / 400;
  return { sc, why: [...new Set(why)].slice(0, 3), matched };
}

function buildDeck() {
  const hasSignal = Object.keys(S.weights).length || S.mentions.length || S.risk != null;
  if (!hasSignal) return [];
  return STOCKS
    .filter(s => !S.swiped[s.t])
    .map(s => ({ s, r: score(s) }))
    .filter(x => x.r !== -Infinity && (x.r.matched.length || S.mentions.includes(x.s.t) || (S.risk != null && Math.abs(x.s.risk - S.risk) < 1 && !Object.keys(S.weights).length)))
    .sort((a, b) => b.r.sc - a.r.sc)
    .map(x => ({ ...x.s, why: x.r.why, sc: x.r.sc }))
    .sort((a, b) => (b.t === pinTop) - (a.t === pinTop));
}
let pinTop = null;

function matchPct(sc, top) { return Math.max(55, Math.min(99, Math.round(60 + 39 * (sc / Math.max(top, 1))))); }

/* ================= Conversation ================= */
const labelOf = k => THEMES[k].label;
const lc = l => /^[A-Z]{2}/.test(l) ? l : l[0].toLowerCase() + l.slice(1);
const list = arr => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
const pick = (arr, seed) => arr[seed % arr.length];

function riskWord(r) {
  if (r == null) return null;
  if (r < 1.8) return 'very steady';
  if (r < 2.6) return 'on the safer side';
  if (r < 3.4) return 'balanced';
  if (r < 4.2) return 'growth-hungry';
  return 'swinging for big moves';
}

function reply(f, ch) {
  const n = S.turns;
  const parts = [];
  const likeL = [...new Set(ch.likes.map(k => lc(labelOf(k))))];
  const disL = [...new Set(ch.dislikes.map(k => lc(labelOf(k))))];

  if (ch.up.length) {
    parts.push(pick(['Nice picks', 'Love it', 'Got it', 'Noted'], n) + ': ' + list(ch.up.map(t => `${BY_T[t].name} (${t})`)) + '. I\'ll add ' + (ch.up.length > 1 ? 'them' : 'it') + ' to your matches and find similar names.');
  }
  if (likeL.length) parts.push((ch.up.length ? 'And I' : 'Got it, I') + ' hear ' + list(likeL) + (likeL.length > 1 ? ' are' : ' is') + ' your thing.');
  if (f.moreLike) parts.push(`Leaning into stocks like ${f.moreLike}.`);
  if (disL.length || ch.down.length) parts.push('Steering clear of ' + list(disL.concat(ch.down)) + '.');
  if (f.riskWords.length) {
    const w = riskWord(S.risk);
    parts.push(pick([`Sounds like you're ${w}. I'll tune your matches to fit.`, `Reading you as ${w}, so I'll weight the picks that way.`, `Okay, ${w} it is.`], n));
  }

  const deck = buildDeck();
  if (!parts.length) {
    const nudges = [
      'Tell me more! What apps or brands do you use every day? What would you never put money into?',
      'Totally fine. Try telling me what you\'re curious about (AI, games, travel, health) or how you\'d feel if a stock dropped 20% in a week.',
      'I didn\'t catch a specific interest there. Name a company you admire, or something you think the future runs on.'
    ];
    return { text: pick(nudges, n), cta: false };
  }

  let tail = '';
  if (deck.length) {
    tail = `\n\nThat gives you ${deck.length} match${deck.length === 1 ? '' : 'es'} to swipe.`;
    if (S.risk == null && n < 3) tail += ' Quick vibe check if you want: would a big dip keep you up at night, or do you buy the dip?';
    else if (Object.keys(S.weights).length < 2 && n < 4) tail += ' Anything else you\'re into? The more you tell me, the sharper it gets.';
    else tail += ' Want to see your matches?';
  } else {
    tail = '\n\nNothing matches yet with those filters. Tell me something you do like and I\'ll build from there.';
  }
  return { text: parts.join(' ') + tail, cta: deck.length > 0 };
}

const GREETING = 'Hey Sofia, I\'m Lu 👋\n\nNo survey here. Just tell me about you: brands you love, what you\'re curious about, what you\'d never put money into, or how you\'d feel if the market dipped. I\'ll turn it into matches you can swipe.';
const SPARKS = [
  'I use my iPhone and Netflix all day',
  'Into AI and chips, happy to take risks',
  'Saving for retirement, want steady dividends',
  'Clean energy yes, oil and tobacco no',
  'I\'m 22 and want to swing big 🚀',
  'Gaming and esports',
  'Just starting out, keep it simple',
  'More like NVDA but less risky'
];

