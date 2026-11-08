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
  ['COIN','Coinbase','#0052ff',5,false,'Large',['crypto','fintech'],['coinbase'],'The largest US crypto exchange.'],
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
  ['SCHD','Schwab US Dividend ETF','#00a0df',1,true,'ETF',['index','dividends','beginner'],['schd','dividend etf'],'A basket of quality US dividend payers.'],
  // Crypto: priced 24/7 in USD. No company or profits behind these, so risk comes purely from price swings.
  ['BTC','Bitcoin','#f7931a',5,false,'Crypto',['crypto'],['bitcoin','btc'],'The original cryptocurrency, often called digital gold. A fixed supply of 21 million coins.'],
  ['ETH','Ethereum','#627eea',5,false,'Crypto',['crypto'],['ethereum','ether','eth'],'The blockchain that most crypto apps, NFTs and stablecoins run on.'],
  ['SOL','Solana','#9945ff',5,false,'Crypto',['crypto'],['solana'],'A fast, low-fee blockchain popular for trading apps and memecoins.'],
  ['XRP','XRP','#23292f',5,false,'Crypto',['crypto','payments'],['ripple','xrp'],'A token designed for moving money across borders quickly and cheaply.'],
  ['DOGE','Dogecoin','#c2a633',5,false,'Crypto',['crypto','memes'],['dogecoin','doge'],'Started as a joke, now the biggest memecoin. Moves on hype and social media.']
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
  gig:       { label:'Gig economy', words:['gig','rideshare','delivery'] },
  memes:     { label:'Memecoins', words:['meme','memes','memecoin','memecoins','meme coin','meme coins'] }
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
  const found = { likes: [], dislikes: [], stocksUp: [], stocksDown: [], riskDelta: 0, riskWords: [], riskCues: [], income: false, moreLike: null, wantsDeck: false, wantsLess: null };
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
    const cueText = w => { const m = c.match(new RegExp('(?:\\b(?:not|no|nothing|don\'?t|never|avoid|too)\\s+){0,3}' + esc(w))); return m ? m[0] : w; };
    highHits.forEach(w => found.riskCues.push({ w: cueText(w), dir: isNegated(c, w, carry) ? -1 : 1 }));
    lowHits.forEach(w => found.riskCues.push({ w: cueText(w), dir: !/lose/.test(w) && isNegated(c, w, carry) ? 1 : -1 }));
    highHits.forEach(w => { if (neg(w)) { found.riskDelta -= 1.2; found.riskWords.push('low'); } else { found.riskDelta += 1.2; found.riskWords.push('high'); } });
    lowHits.forEach(w => { if (!/lose/.test(w) && neg(w)) { found.riskDelta += 0.8; found.riskWords.push('high'); } else { found.riskDelta -= 1; found.riskWords.push('low'); } });
    if (midHits.length) { found.riskWords.push('mid'); found.riskDelta += 0; found.mid = true; }
    if (!highHits.length && /\b(less|lower|reduce|tone down)\b.*\b(risk|risky|volatile|crazy|wild)\b/.test(c)) { found.riskDelta -= 1.2; found.riskWords.push('low'); }
    if (!highHits.length && /\b(more|higher|crank up|spicier|spicy)\b.*\b(risk|risky|aggressive|volatile)\b/.test(c)) { found.riskDelta += 1.2; found.riskWords.push('high'); }
    if (/\b(retire|retirement)\b/.test(c) && /\b(in|within)\s+\d+\s+years?\b/.test(c)) {
      const yrs = +c.match(/\d+/)[0]; found.riskDelta += yrs >= 25 ? 1.5 : yrs <= 10 ? -1 : 0;
    }
    const age = c.match(/\b(i'?m|i am|age)\s*(\d{2})\b/);
    if (age) { const a = +age[2]; if (a >= 16 && a <= 90) { found.riskDelta += a < 30 ? 0.8 : a > 55 ? -1 : 0; if (a < 30 || a > 55) { found.riskCues.push({ w: `you're ${a}`, dir: a < 30 ? 1 : -1 }); found.riskWords.push(a < 30 ? 'high' : 'low'); } } }
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
  if (f.riskCues && f.riskCues.length) {
    const dir = Math.sign(f.riskDelta);
    f.riskCues = f.riskCues.filter(c => !dir || c.dir === dir);
    S.riskCues = (S.riskCues || []).concat(f.riskCues.map(c => c.w)).slice(-6);
  }
  if (f.income) S.income = true;
  if (f.dislikes.includes('dividends')) S.income = false;
  return changes;
}

/* ================= Recommendation ================= */
/* ================= Real market data ================= */
// risk-data.json is rebuilt daily from real prices (scripts/build-risk-data.mjs). When it loads,
// each stock's curated risk guess is replaced by a score computed from its actual 1-year volatility,
// beta and worst drawdown, so matching follows how the stock really behaves.
let RISK_DOC = null;
function applyRiskData(doc) {
  if (!doc || !doc.stocks) return 0;
  RISK_DOC = doc;
  let n = 0;
  for (const s of STOCKS) {
    const d = doc.stocks[s.t];
    if (d) { if (s.estRisk == null) s.estRisk = s.risk; s.risk = d.risk; s.live = d; n++; }
    else if ((doc.failed || []).includes(s.t)) s.unavailable = true;
  }
  return n;
}
const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
const asOfLabel = () => RISK_DOC ? new Date(RISK_DOC.asOf + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
function liveRiskLine(s) {
  const d = s.live; if (!d) return '';
  const calm = d.vol < 0.2 ? 'calmer than the market as a whole' : d.vol < 0.3 ? 'about average for a single stock' : d.vol < 0.5 ? 'noticeably jumpier than most stocks' : 'one of the wildest rides out there';
  return `Over the past year it swung about ${pct(d.vol)} a year (${calm}), and its worst drop from a high was ${pct(d.maxDD)}.`;
}

function score(s) {
  if (s.unavailable) return -Infinity;
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
    const l = riskLevel(S.risk);
    const cues = (f.riskCues || []).slice(0, 2).map(c => `"${c.w || c}"`);
    const because = cues.length ? ` because you said ${list(cues)}` : '';
    parts.push(pick([`I've set your risk dial to ${l}/5 (${RISK_LEVELS[l].name.toLowerCase()})${because}.`, `Reading you as ${l}/5, ${RISK_LEVELS[l].name.toLowerCase()}${because}.`, `Risk dial: ${l}/5${because}.`], n) + ' Say "riskier" or "safer" anytime to adjust.');
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

const GREETING = 'Hey Sofia, I\'m Lu 👋\n\nNo survey here. Just tell me about you: brands you love, what you\'re curious about, what you\'d never put money into, or how you\'d feel if the market dipped. I\'ll turn it into matches you can swipe, rated by how much each stock has really swung over the past year.';
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


/* ================= Risk dial ================= */
// Users can change their risk tolerance any time, in their own words:
//   "set my risk to 2", "medium risk please", "a bit riskier", "way safer", "crank it up",
//   "actually I'm more aggressive now", "what's my risk level?", "reset my risk".
const RISK_LEVELS = {
  1: { name: 'Very steady', blurb: 'Index funds, utilities and household names that barely flinch.' },
  2: { name: 'Safer', blurb: 'Big, established companies with gentle ups and downs.' },
  3: { name: 'Balanced', blurb: 'A mix of steady names and some growth, with normal market swings.' },
  4: { name: 'Growth-focused', blurb: 'Bigger swings in exchange for more upside potential.' },
  5: { name: 'High-risk, high-reward', blurb: 'The wildest rides, including crypto. Big drops are part of the deal.' }
};
const NAMED_LEVELS = [
  [1, /\b(super safe|safest|ultra safe|no risk|zero risk|very conservative|lowest risk|very low risk)\b/],
  [5, /\b(max(imum)? risk|very aggressive|full send|yolo|degen|highest risk|very high risk|moonshots?)\b/],
  [2, /\b(conservative|low risk|low-risk|play it safe|safe side|cautious)\b/],
  [4, /\b(aggressive|high risk|high-risk|growth mode|risk taker)\b/],
  [3, /\b(moderate|medium risk|medium|balanced|middle ground|in between|in the middle|mid risk)\b/]
];
const CHANGE_CUE = /\b(actually|changed? my mind|instead|now|switch|make (it|me|my|things)|set|go|change|update|turn|move|put me|i'?m (more|feeling))\b/;
function riskIntent(raw) {
  const low = raw.toLowerCase().replace(/[’']/g, '\'').trim();
  if (/\b(what'?s|what is|whats|show( me)?|tell me|where'?s)\b.*\bmy\b.*\b(risk|tolerance|dial|level)\b|\bhow risky am i\b|\bwhat risk (level )?(am i|did you)\b/.test(low)) return { type: 'query' };
  if (/\b(reset|clear|forget|start over|undo)\b.*\b(risk|tolerance|dial)\b/.test(low)) return { type: 'reset' };
  if (/\b(keep|stay|leave)\b.*\b(it|my risk|risk|dial)\b.*\b(where it is|as is|the same|there)\b/.test(low) && S.risk != null) return { type: 'set', value: riskLevel(S.risk) };
  const keep = low.match(/\b(?:keep|stay|leave)\b[^0-9]{0,20}\b([1-5])\b/);
  if (keep) return { type: 'set', value: +keep[1] };
  const num = low.match(/\b(?:risk|level|tolerance|dial)\b[^0-9]{0,24}\b([1-5])\b(?!\s*%)/) || low.match(/\b([1-5])\s*(?:\/|out of)\s*5\b/);
  if (num) return { type: 'set', value: +num[1] };
  for (const [v, re] of NAMED_LEVELS) {
    const m = low.match(re); if (!m) continue;
    if (!(CHANGE_CUE.test(low) || /\brisk\b/.test(low) || low.split(/\s+/).length <= 4)) continue;
    const negated = isNegated(low, m[0], false);
    return { type: 'set', value: negated ? (v >= 3 ? Math.max(1, v - 2) : Math.min(5, v + 2)) : v, phrase: m[0], negated };
  }
  const moreW = /\b(more|higher|riskier|spicier|bolder|wilder|crank|turn (it )?up|increase|raise|bump|amp|level up)\b/.test(low);
  const lessW = /\b(less|lower|safer|calmer|tone (it )?down|turn (it )?down|decrease|reduce|dial (it )?back|chill(er)?|not as)\b/.test(low);
  const topic = /\b(risk|risky|riskier|aggressive|volatile|volatility|spicy|spicier|bold|bolder|wild|wilder|safer|calmer|crank|turn it (up|down)|tone it down|dial it back|bump it|amp it|chill|chiller|swings?)\b/.test(low);
  if (topic && moreW !== lessW && !/\bnot (too|that|very|so)\b/.test(low)) {
    const mag = /\b(a (little|bit|touch|tad|notch)|slightly|bit|notch)\b/.test(low) ? 0.5 : /\b(way|much|a lot|lots|really|super)\b/.test(low) ? 1.5 : 1;
    return { type: 'adjust', delta: moreW ? mag : -mag };
  }
  return null;
}
/** Applies a risk intent to the profile. Returns { before, after } (after null when reset). */
function applyRisk(ri) {
  const before = S.risk;
  if (ri.type === 'reset') { S.risk = null; S.riskManual = false; return { before, after: null }; }
  const base = S.risk == null ? 3 : S.risk;
  const after = ri.type === 'set' ? ri.value : Math.max(1, Math.min(5, Math.round((base + ri.delta) * 2) / 2));
  S.risk = after; S.riskManual = true; S.riskSignals = (S.riskSignals || 0) + 1;
  return { before, after };
}
const riskLevel = r => Math.max(1, Math.min(5, Math.round(r)));
/** Real-data snapshot for a risk level: typical yearly swing, typical worst drop, example tickers. */
function levelStats(lvl) {
  const pool = STOCKS.filter(s => !s.unavailable && s.live && s.risk === lvl);
  if (!pool.length) return null;
  const med = a => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };
  return { vol: med(pool.map(s => s.live.vol)), dd: med(pool.map(s => s.live.maxDD)), n: pool.length,
    examples: pool.sort((a, b) => (b.cap === 'Mega') - (a.cap === 'Mega') || a.live.vol - b.live.vol).slice(0, 3).map(s => s.t) };
}
function dialLine(r) { const l = riskLevel(r); return `Risk dial: ${l}/5 · ${RISK_LEVELS[l].name}`; }
/** Lu's reply when the risk dial moves: what changed, what it means in dollars, and what's in the deck now. */
function riskReply(before, after, deckBefore) {
  if (after == null) return 'Done. I\'ve cleared your risk setting. Tell me how you\'d feel if your money dropped 20% in a month, and I\'ll read it fresh.';
  const l = riskLevel(after), st = levelStats(l);
  const from = before == null ? '' : riskLevel(before) === l ? `Staying at ${l}/5. ` : `Moved your dial from ${riskLevel(before)}/5 to ${l}/5. `;
  let text = `${from}${dialLine(after)}\n\n${RISK_LEVELS[l].blurb}`;
  if (st) {
    const left = Math.round(100 * (1 - st.dd));
    text += `\n\nWhat that feels like (real data): stocks at this level swung about ${Math.round(st.vol * 100)}% over the past year, and the typical one dropped ${Math.round(st.dd * 100)}% from its high at some point. Put in $100, and at the worst moment you might have seen about $${left}.`;
  }
  const now = buildDeck().slice(0, 3).map(s => s.t);
  if (now.length) text += `\n\nYour top matches now: ${now.join(', ')}` + (deckBefore && deckBefore.length && deckBefore.join() !== now.join() ? ` (was ${deckBefore.join(', ')}).` : '.');
  text += '\n\nChange it anytime: "a bit safer", "riskier", or "set my risk to 3".';
  return text;
}
function riskQueryReply() {
  if (S.risk == null) return 'I haven\'t pinned down your risk level yet. Tell me something like "I\'d panic if my money dropped 20%" or "I\'m in it for the long haul, swings don\'t bother me", or just say "set my risk to 3".';
  const why = (S.riskCues || []).slice(-3);
  return `Here's where your dial is:\n${dialLine(S.risk)}\n\n${RISK_LEVELS[riskLevel(S.risk)].blurb}` + (why.length ? `\n\nI got there because you said ${why.map(w => `"${w}"`).join(', ')}.` : S.riskManual ? '\n\nYou set this yourself.' : '') + '\n\nWant to change it? Say "a bit riskier", "safer", or a number from 1 to 5.';
}

/* ================= Why this matches ================= */
function whySentence(s) {
  const bits = [];
  if (S.mentions.includes(s.t)) bits.push(`You brought up ${s.name.split(' ')[0]} with Lu.`);
  const th = s.themes.filter(k => S.weights[k] > 0).sort((a, b) => S.weights[b] - S.weights[a]).slice(0, 2).map(k => lc(labelOf(k)));
  if (th.length) bits.push(`${bits.length ? 'It also fits' : 'Fits'} your interest in ${list(th)}.`);
  if (S.risk != null && Math.abs(s.risk - S.risk) < 1.2) bits.push(s.live
      ? (S.risk <= 2.4 ? `Only ${pct(s.live.vol)} yearly swings, with a worst drop of ${pct(s.live.maxDD)}, which suits your steady style.` : S.risk >= 3.6 ? `It swung ${pct(s.live.vol)} a year, in line with the risk you said you\'re okay with.` : `Its ${pct(s.live.vol)} yearly swings sit right in your comfort zone.`)
      : (S.risk <= 2.4 ? 'Low volatility suits your steady style.' : S.risk >= 3.6 ? 'Bigger swings, in line with the risk you said you\'re okay with.' : 'Sits right in your comfort zone on risk.'));
  else if (S.risk != null && s.risk > S.risk) bits.push('Heads up: a bit more volatile than you said you like.');
  if (S.income && s.div) bits.push('Pays a dividend, which you mentioned wanting.');
  return bits.join(' ') || s.blurb;
}

/* ================= Questions & learning ================= */
// Lu is a financial *education* buddy: plain-English answers, never "buy this" advice.
const GLOSSARY = {
  stock:   { ask: 'a stock', terms: ['stock','stocks','share','shares','equity'], title: 'Stocks',
    text: 'A stock (or share) is a tiny slice of ownership in a company. If the company grows and earns more, your slice can be worth more. If it struggles, it can lose value. You can usually buy fractional shares, so $5 works as well as $500.', rel: ['etf','diversification'] },
  etf:     { ask: 'an ETF', terms: ['etf','etfs','exchange traded fund','exchange-traded fund'], title: 'ETFs',
    text: 'An ETF is a basket of many investments you buy in one go, like a playlist instead of a single song. VTI, for example, holds thousands of US companies at once, so one bad company barely moves it. ETFs usually have low fees, which is why they\'re a popular first investment.', rel: ['indexfund','expense','diversification'] },
  indexfund: { ask: 'an index fund', terms: ['index fund','index funds','index'], title: 'Index funds',
    text: 'An index fund copies a market index (like the S&P 500) instead of trying to pick winners. You get the whole market\'s average return for a tiny fee. Over long periods, most professional stock pickers fail to beat it.', rel: ['etf','dca'] },
  dividend: { ask: 'a dividend', terms: ['dividend','dividends','yield','dividend yield'], title: 'Dividends',
    text: 'A dividend is cash a company pays shareholders, usually every quarter, out of its profits. A 3% yield means roughly $3 a year for every $100 invested. Dividend payers tend to be mature, steadier companies; fast growers usually reinvest instead.', rel: ['compound','stock'] },
  pe:      { ask: 'P/E ratio', terms: ['p/e','pe ratio','p/e ratio','price to earnings','price-to-earnings','pe'], title: 'P/E ratio',
    text: 'P/E (price-to-earnings) compares a stock\'s price to the profit per share. A P/E of 25 means investors pay $25 for every $1 of yearly profit. High P/E usually means people expect fast growth (and can mean "pricey"); low P/E can mean cheap, or that growth is slowing.', rel: ['marketcap','volatility'] },
  marketcap: { ask: 'market cap', terms: ['market cap','market capitalization','mega cap','large cap','mid cap','small cap','cap'], title: 'Market cap',
    text: 'Market cap is a company\'s total value: share price × number of shares. Mega and large caps (Apple, Microsoft) are giants that tend to move more calmly. Mid and small caps have more room to grow, and more room to fall.', rel: ['volatility','pe'] },
  volatility: { ask: 'volatility', terms: ['volatility','volatile','beta','risk level','risky','risk'], title: 'Volatility & risk',
    text: 'Volatility is how much a price swings. A high-risk stock might drop 30% in a month and bounce back; a low-risk one moves a few percent. Higher risk can mean higher long-term reward, but only if you can hold through the dips without panic-selling.', rel: ['diversification','dca'] },
  diversification: { ask: 'diversification', terms: ['diversification','diversify','diversified'], title: 'Diversification',
    text: 'Diversifying means not putting all your eggs in one basket: spreading money across companies, industries and fund types so one bad pick can\'t sink you. An index fund is instant diversification.', rel: ['etf','indexfund'] },
  compound: { ask: 'compound interest', terms: ['compound interest','compounding','compound'], title: 'Compounding',
    text: 'Compounding is earning returns on your returns. $100 a month at a 7% average return grows to about $52k in 20 years, even though you only put in $24k. Starting early matters more than starting big.', rel: ['dca','dividend'] },
  dca:     { ask: 'dollar-cost averaging', terms: ['dollar cost averaging','dollar-cost averaging','dca','auto invest','auto-invest','recurring'], title: 'Dollar-cost averaging',
    text: 'Dollar-cost averaging means investing a fixed amount on a schedule (say $25 every Friday) no matter what the market does. You automatically buy more when prices are low and less when high, and you skip the stress of timing the market.', rel: ['compound','indexfund'] },
  expense: { ask: 'an expense ratio', terms: ['expense ratio','fees','fee','expense ratios'], title: 'Expense ratio',
    text: 'An expense ratio is a fund\'s yearly fee as a percent of what you invest. 0.03% means 30 cents a year per $1,000. Small numbers add up over decades, so lower is better.', rel: ['etf','indexfund'] },
  bullbear: { ask: 'a bear market', terms: ['bear market','bull market','bear','bull','crash','correction','recession'], title: 'Bull & bear markets',
    text: 'A bull market is when prices rise for a long stretch; a bear market is a drop of 20% or more from the peak. Bear markets have always ended eventually, and people who keep investing through them usually come out ahead.', rel: ['volatility','dca'] },
  emergency: { ask: 'an emergency fund', terms: ['emergency fund','rainy day fund','savings account'], title: 'Emergency fund',
    text: 'An emergency fund is 3–6 months of expenses kept in cash so a surprise bill never forces you to sell investments at a bad time. Most people build this before investing heavily.', rel: ['compound','roth'] },
  roth:    { ask: 'a Roth IRA', terms: ['roth ira','roth','ira','401k','401(k)','retirement account'], title: 'Retirement accounts',
    text: 'A Roth IRA lets you invest money you\'ve already paid tax on, then withdraw it tax-free in retirement. A 401(k) is through your employer, often with a free match. Grab the match first; it\'s an instant 50–100% return.', rel: ['compound','indexfund'] },
  crypto:  { ask: 'crypto', terms: ['crypto','bitcoin','cryptocurrency'], title: 'Crypto',
    text: 'Crypto like bitcoin is a digital asset with no company or profits behind it, so its price is driven by demand alone. That makes it extremely volatile: 50%+ drops have happened several times. If you dabble, keep it a small slice you could afford to lose.', rel: ['volatility','diversification'] }
};
function findTerm(low) {
  let best = null, bestLen = 0;
  for (const [k, g] of Object.entries(GLOSSARY)) for (const t of g.terms) if (t.length > bestLen && hasPhrase(low, t)) { best = k; bestLen = t.length; }
  return best;
}
const RISK_LABEL = ['', 'very low', 'low', 'medium', 'high', 'very high'];
const QUESTION = /\?\s*$|^\s*(what|what'?s|whats|how|why|explain|define|meaning|tell me|who|is|are|should|can|could|does|do|which|wtf|eli5)\b/;
const RECO = /\b(good|best|recommend|suggest|should i (buy|get|pick)|what (stock|stocks|etf|etfs) should|give me|find me|show me)\b/;

const kindLabel = s => s.cap === 'ETF' ? 'Index fund' : s.cap === 'Crypto' ? 'Crypto' : s.cap + ' cap';
const kindTerm = s => s.cap === 'ETF' ? 'etf' : s.cap === 'Crypto' ? 'crypto' : 'marketcap';
function stockFacts(s) {
  if (s.live) return `Risk: ${RISK_LABEL[s.risk]} (${s.risk}/5) from real data · ${pct(s.live.vol)} yearly volatility · worst drop ${pct(s.live.maxDD)} · ${s.div ? 'pays a dividend' : 'no dividend'}`;
  return `Risk: ${RISK_LABEL[s.risk]} (${s.risk}/5) · ${kindLabel(s).toLowerCase()} · ${s.div ? 'pays a dividend' : 'no dividend'}`;
}
function answerQuestion(raw) {
  const low = raw.toLowerCase().replace(/[’']/g, '\'').trim();
  if (!QUESTION.test(low)) return null;
  const tickers = findStocks(raw, low);
  if (tickers.length >= 2 && /\b(vs|versus|or|compare|compared|better|difference)\b/.test(low)) {
    const [a, b] = tickers.map(t => BY_T[t]);
    const safer = a.risk === b.risk ? null : (a.risk < b.risk ? a : b);
    return { ticker: a.t, text: `${a.t} vs ${b.t}:\n\n• ${a.name}: ${a.blurb} ${stockFacts(a)}.\n• ${b.name}: ${b.blurb} ${stockFacts(b)}.\n\n${safer ? `${safer.t} is the calmer of the two.` : 'They carry similar risk.'} Neither is "better". It depends on whether you want steadier or bigger swings.`,
      suggestions: [`add ${a.t} to my matches`, `add ${b.t} to my matches`, 'what\'s volatility?'] };
  }
  if (tickers.length && !RECO.test(low)) {
    const s = BY_T[tickers[0]];
    let text;
    if (/\b(risky|risk|safe|safer|volatile|scary)\b/.test(low)) {
      text = `${s.name} is ${RISK_LABEL[s.risk]} risk (${s.risk}/5). ` + (s.live ? liveRiskLine(s) + (s.live.beta > 1.3 ? ` It also tends to move ${s.live.beta.toFixed(1)}× as much as the overall market.` : '') : s.risk >= 4 ? 'Expect big swings: drops of 30%+ in a rough year wouldn\'t be unusual.' : s.risk <= 2 ? 'It tends to move calmly compared with the overall market.' : 'It moves roughly in line with the market: some ups and downs, nothing wild.');
      if (S.risk != null) text += Math.abs(s.risk - S.risk) < 1.2 ? ' That lines up with what you told me.' : s.risk > S.risk ? ' That\'s spicier than the comfort level you described.' : ' That\'s calmer than what you said you\'re okay with.';
    } else if (/\bwhy\b/.test(low)) {
      text = `Why ${s.t}? ${whySentence(s)}`;
    } else if (/\b(dividend|pay)\b/.test(low)) {
      text = s.div ? `Yes. ${s.name} pays a dividend, so you\'d get a little cash back regularly just for holding it.` : `${s.name} doesn\'t pay a dividend. It reinvests profits into growth instead.`;
    } else {
      text = `${s.name} (${s.t}): ${s.blurb}\n\n${stockFacts(s)}.`;
      const w = whySentence(s);
      if (w !== s.blurb) text += `\n\nFor you: ${w}`;
    }
    const askedRisk = /\b(risky|risk|safe|safer|volatile|scary)\b/.test(low);
    const sug = [S.swiped[s.t] === 'like' ? null : `add ${s.t} to my matches`, `more like ${s.t}`, askedRisk ? `why ${s.t}?` : `is ${s.t} risky?`, askedRisk ? 'what\'s volatility?' : 'what\'s market cap?'];
    return { ticker: s.t, text, suggestions: sug.filter(Boolean) };
  }
  if (/\bhow much\b.*\b(invest|start|put|need)\b|\bhow (do|should|can) i (start|begin)\b|\bwhere (do|should) i start\b/.test(low)) {
    return { text: 'From your linked accounts, you have about $486 a month available to invest and $250 ready in your Luma wallet. A common starting move: keep your emergency fund intact, then auto-invest a small fixed amount (even $10–25 a week) into a broad index fund like VTI, and add individual picks you\'ve saved as a smaller slice.\n\nThis is education, not personal financial advice.',
      suggestions: ['what\'s an emergency fund?', 'what\'s dollar-cost averaging?', 'tell me about VTI'] };
  }
  const key = findTerm(low);
  if (key && !RECO.test(low)) {
    const g = GLOSSARY[key];
    return { term: key, text: `${g.title} 101\n\n${g.text}`, suggestions: g.rel.map(k => `what's ${GLOSSARY[k].ask}?`).concat(['show my matches']) };
  }
  if (/\b(who|what) are you\b|\bwhat can you do\b|\bhelp\b/.test(low)) {
    return { text: 'I\'m Lu! Tell me what you\'re into and I\'ll build matches you can swipe. Ask me things like "what\'s an ETF?", "is Tesla risky?" or "AAPL vs MSFT" and I\'ll explain in plain English.',
      suggestions: ['what\'s an ETF?', 'is Tesla risky?', 'AAPL vs MSFT?'] };
  }
  return null;
}

// Quick replies that follow the conversation instead of a fixed list.
function nextSuggestions(ch) {
  const out = [];
  const d = buildDeck();
  if (d.length) out.push('show my matches');
  const lastUp = ch && ch.up && ch.up[ch.up.length - 1];
  if (lastUp) out.push(`more like ${lastUp}`);
  if (S.risk == null) out.push('I get nervous when stocks drop');
  else if (S.risk >= 3.4) out.push('a bit less risky');
  else out.push('I can handle more risk');
  if (!Object.keys(S.weights).length) out.push('I love gaming and sneakers');
  if (!S.excluded.length) out.push('no oil or tobacco');
  const topTerm = Object.keys(S.weights).includes('index') ? 'etf' : S.risk != null ? 'volatility' : 'etf';
  out.push(`what's ${GLOSSARY[topTerm].ask}?`);
  return [...new Set(out)].slice(0, 5);
}
