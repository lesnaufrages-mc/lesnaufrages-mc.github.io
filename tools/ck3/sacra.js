// Sacred Architecture generator (Node port of make_sacred_architecture.py; the per-faith handling of replaced religions in --pack mode exists only here).
// node sacra.js "<CK3 game folder>" "<output mod folder>" [--pack <key> "<mod folder>" "<mod name>"]
const fs = require('fs'), path = require('path');
const [GAME, OUT] = process.argv.slice(2);
const pi = process.argv.indexOf('--pack');
const PACK = pi > 0 ? process.argv.slice(pi + 1, pi + 4) : null;
const PK = PACK ? `sacra_${PACK[0]}` : 'sacra';

function stripComments(t) {
  return t.split('\n').map(ln => { let r = '', q = false; for (const ch of ln) { if (ch === '"') q = !q; if (ch === '#' && !q) break; r += ch; } return r; }).join('\n');
}
function parse(t) {
  const toks = stripComments(t).match(/"[^"]*"|[{}=]|[^\s{}=]+/g) || [];
  let pos = 0;
  function block() {
    const items = [];
    while (pos < toks.length) {
      const tk = toks[pos];
      if (tk === '}') { pos++; return items; }
      pos++;
      if (pos < toks.length && toks[pos] === '=') {
        pos++;
        let v = toks[pos]; pos++;
        if (v === '{') v = block();
        else if (['rgb', 'hsv', 'hsv360'].includes(v) && pos < toks.length && toks[pos] === '{') {
          pos++; v = v + ' { ' + block().map(x => x[1]).join(' ') + ' }';
        }
        items.push([tk, v]);
      } else if (tk === '{') items.push([null, block()]);
      else items.push([null, tk]);
    }
    return items;
  }
  return block();
}
const get = (items, k) => (items || []).filter(x => x[0] === k).map(x => x[1]);
const first = (items, k, d = null) => { const r = get(items, k); return r.length ? r[0] : d; };
function dump(v, ind = 1) {
  if (typeof v === 'string') return v;
  let s = '{\n';
  for (const [k, x] of v) s += '\t'.repeat(ind) + (k ? k + ' = ' : '') + dump(x, ind + 1) + '\n';
  return s + '\t'.repeat(ind - 1) + '}';
}
function files(dir, re) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => re.test(f)).sort().map(f => path.join(dir, f));
}
const read = f => parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const R = path.join(GAME, 'common', 'religion');
const MR = PACK ? path.join(PACK[1], 'common', 'religion') : null;
function load(sub, re, modRe) {
  let items = [];
  for (const f of files(path.join(R, sub), re)) items = items.concat(read(f));
  if (MR && modRe) for (const f of files(path.join(MR, sub), modRe)) items = items.concat(read(f));
  return items;
}
const toMap = items => { const m = new Map(); for (const [k, v] of items) m.set(k, v); return m; };
const TXT = /\.txt$/;
let religions = load('religion_types', /^00_.*\.txt$/);
const faithsIn = load('faith_types', /^00_faith_types\.txt$/, TXT);
const rites = toMap(load('rite_types', /^0.*\.txt$/, TXT));
const groups = toMap(load('doctrine_group_types', /^00_doctrine_group_types\.txt$/, TXT));
const docGroup = new Map(load('doctrine_types', TXT, TXT).map(([k, v]) => [k, first(v, 'doctrine_group_type')]));
const vanillaReligions = religions;
let overridden = [];
if (PACK) {
  const vanilla = new Set(religions.map(x => x[0])), seen = new Set(), over = new Set();
  religions = [];
  for (const f of files(path.join(MR, 'religion_types'), TXT)) for (const [k, v] of read(f)) {
    if (!k || first(v, 'religion_details') === null) continue;
    if (vanilla.has(k)) over.add(k);
    else if (!seen.has(k)) { seen.add(k); religions.push([k, v]); }
  }
  overridden = [...over];
}
const locked = new Set([...groups].filter(([g, v]) => ['faith', 'religion'].includes(first(v, 'doctrine_lock'))).map(x => x[0]));
const PREFERRED = { christianity_religion: 'catholic', islam_religion: 'sunni', judaism_religion: 'rabbinic_faith', buddhism_religion: 'mahayana_faith', hinduism_religion: 'vaishnava_faith', zoroastrianism_religion: 'mazdayasna', dualism_religion: 'manichaean_faith' };
const STYLE_KEYS = ['catholic', 'orthodox', 'islamic', 'dharmic', 'sinitic', 'shinto', 'zoroastrian', 'tengrism', 'kamuyism', 'pagan'];
const faithByKey = new Map();
for (const [k, v] of faithsIn) if (first(v, 'faith_details') !== null) faithByKey.set(k, v);
const byRel = new Map();
for (const [k, v] of faithByKey) { const rel = first(first(v, 'faith_details'), 'religion'); if (!byRel.has(rel)) byRel.set(rel, []); byRel.get(rel).push([k, v]); }
function baseFaith(rel) {
  const c = byRel.get(rel);
  if (PREFERRED[rel]) return c.find(x => x[0] === PREFERRED[rel]);
  const live = c.filter(x => first(x[1], 'historical') !== 'yes');
  return (live.length ? live : c)[0];
}
const listOf = (v, key) => { const r = first(v, key); return r ? r.map(x => x[1]) : []; };
// The 10 style faiths of one source faith, named by nameOf(style).
function styleFaiths(nameOf, rel, fk, fv) {
  const out = [];
  const det = first(fv, 'faith_details');
  let rite = rites.get(first(fv, 'main_rite', '')) || [];
  if (!rite.length) { const f = [...rites].find(([k, v]) => first(v, 'faith') === fk); rite = f ? f[1] : []; }
  const tenets = listOf(fv, 'tenets').length ? listOf(fv, 'tenets') : listOf(rite, 'tenets');
  const pairs = get(fv, 'tenet_selection_pair').length ? get(fv, 'tenet_selection_pair') : get(rite, 'tenet_selection_pair');
  const docs = new Map();
  for (const d of listOf(fv, 'doctrines').concat(listOf(rite, 'doctrines'))) {
    const g = docGroup.get(d);
    if (g == null || d.includes('unreformed') || locked.has(g) || g === 'unreformed_faith') continue;
    docs.set(g, d);
  }
  const loc = new Map();
  for (const [k, x] of first(fv, 'localization') || []) loc.set(k, x);
  for (const [k, x] of first(rite, 'localization') || []) loc.set(k, x);
  for (const st of STYLE_KEYS) {
    const L = [`${nameOf(st)} = {`, '\tfaith_details = {', `\t\treligion = ${rel}`];
    const c = first(det, 'color');
    if (c !== null) L.push('\t\tcolor = ' + (typeof c === 'string' ? c : '{ ' + c.map(x => x[1]).join(' ') + ' }'));
    for (const key of ['icon', 'reformed_icon']) if (first(det, key)) L.push(`\t\t${key} = ${first(det, key)}`);
    if (!first(det, 'icon')) L.push(`\t\ticon = ${fk}`);
    L.push(`\t\tgraphical_faith = "${st}_gfx"`, '\t}');
    for (const key of ['eminent_holy_sites', 'holy_sites']) { const hs = listOf(fv, key); if (hs.length) L.push(`\t${key} = { ` + hs.join(' ') + ' }'); }
    if (tenets.length) L.push('\ttenets = { ' + tenets.join(' ') + ' }');
    for (const p of pairs) L.push('\ttenet_selection_pair = ' + dump(p, 2));
    if (docs.size) L.push('\tdoctrines = { ' + [...docs.values()].join(' ') + ' }');
    if (loc.size) { L.push('\tlocalization = {'); for (const [k, x] of loc) L.push(`\t\t${k} = ` + dump(x, 3)); L.push('\t}'); }
    L.push('}');
    out.push(L.join('\n'));
  }
  return out;
}
const outFaiths = [], rels = [];
for (const [rel] of religions) {
  if (!byRel.has(rel)) { console.log('skipped (no faith):', rel); continue; }
  rels.push(rel);
  outFaiths.push(...styleFaiths(st => `sacra_${rel}_${st}_style`, rel, ...baseFaith(rel)));
}
// A pack that replaces a vanilla religion (e.g. Polytheism Reborn and germanic_religion) often moves
// the god names from the religion to each faith. Each of its faiths then gets its own style faiths,
// so a rite keeps its own gods when it changes temples.
const perFaith = [];
for (const rel of overridden) {
  if (!byRel.has(rel)) continue;
  for (const [fk, fv] of byRel.get(rel)) {
    perFaith.push([rel, fk]);
    outFaiths.push(...styleFaiths(st => `${PK}_${fk}_${st}_style`, rel, fk, fv));
  }
}
const FAITHS = outFaiths.join('\n\n') + '\n';
const VERSION = PACK ? '1.0.3' : '1.0.2';
const BASE_NAME = 'Sacred Architecture - Choose Your Temples';
const NAME = PACK ? `Sacred Architecture - ${PACK[2]} Compatibility` : BASE_NAME;
const FOLDER = PACK ? `sacred_architecture_${PACK[0]}` : 'sacred_architecture';
const STYLES = [
  ['catholic', 'catholic', 'Latin Cathedrals', 'Cathedral', 'Cathédrales latines', 'des cathédrales'],
  ['orthodox', 'christianity_orthodox_cross_01', 'Byzantine Churches', 'Byzantine Church', 'Églises byzantines', 'des églises byzantines'],
  ['islamic', 'sunni', 'Mosques', 'Mosque', 'Mosquées', 'des mosquées'],
  ['dharmic', 'hinduism_01', 'Dharmic Temples', 'Dharmic Temple', 'Temples dharmiques', 'des temples dharmiques'],
  ['sinitic', 'taoism_01', 'Chinese Temples & Pagodas', 'Pagoda', 'Temples chinois et pagodes', 'des pagodes'],
  ['shinto', 'shinto', 'Shinto Shrines', 'Shrine', 'Sanctuaires shinto', 'des sanctuaires shinto'],
  ['zoroastrian', 'zoroastrian_custom', 'Fire Temples', 'Fire Temple', 'Temples du feu', 'des temples du feu'],
  ['tengrism', 'tengri_01', 'Steppe Sanctuaries', 'Steppe Sanctuary', 'Sanctuaires des steppes', 'des sanctuaires des steppes'],
  ['kamuyism', 'kamuyism_01', 'Ainu Sanctuaries', 'Ainu Sanctuary', 'Sanctuaires aïnous', 'des sanctuaires aïnous'],
  ['pagan', 'pagan_01', 'Ancient Pagan Temples', 'Old Temple', 'Temples païens anciens', 'des temples anciens'],
];
function write(p, text, bom = true) {
  const full = path.join(OUT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, (bom ? '﻿' : '') + text, 'utf8');
}
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
const HEAD = `# ${NAME} ${VERSION}\n# Prefix: ${PK}. Every key and file of this mod starts with ${PK} / zz_${PK}_.\n\n`;

write(`common/religion/faith_types/zz_${PK}_faiths.txt`, HEAD +
  "# A faith's temple style (graphical_faith) cannot be changed by script, so each religion gets one\n" +
  "# empty faith per style. The decision moves the player's rite (with all its followers) into one.\n\n" + FAITHS);

let t = HEAD + `${PK}_supported_religion_trigger = {\n\tfaith ?= {\n\t\tOR = {\n`;
t += rels.map(r => `\t\t\treligion_tag = ${r}\n`).join('');
t += '\t\t}\n\t}\n}\n';
if (!PACK) t += '\nsacra_can_reform_rite_trigger = {\n\tOR = {\n\t\trite ?= { head_of_rite ?= root }\n\t\tfaith ?= { religious_head ?= root }\n\t}\n}\n';
write(`common/scripted_triggers/zz_${PK}_triggers.txt`, t);

const FIX_OLD = '\n# The old faith keeps working if other rites still follow it.\nsacra_fix_old_faith_effect = {\n\tscope:sacra_old_faith = {\n\t\tif = {\n\t\t\tlimit = {\n\t\t\t\tNOT = { exists = main_rite }\n\t\t\t\tany_faith_rite = { always = yes }\n\t\t\t}\n\t\t\trandom_faith_rite = { set_main_rite = yes }\n\t\t}\n\t}\n}\n';
// branches: [condition on scope:sacra_old_faith, target faith with $STYLE$]
function moveEffect(name, branches) {
  let e = `${name} = {\n`;
  branches.forEach(([cond, target], i) => {
    e += `\t${i === 0 ? 'if' : 'else_if'} = {\n\t\tlimit = { scope:sacra_old_faith = { ${cond} } }\n` +
      `\t\tscope:sacra_rite = {\n\t\t\tset_parent_faith = {\n\t\t\t\ttarget = ${target}\n` +
      '\t\t\t\tmain = no\n\t\t\t\tinclude_derived = no\n\t\t\t}\n\t\t}\n\t}\n';
  });
  return e + '}\n';
}
const relBranches = list => list.map(r => [`religion_tag = ${r}`, `faith:sacra_${r}_$STYLE$_style`]);
let e = HEAD + "# Moves scope:sacra_rite into the $STYLE$ faith of scope:sacra_old_faith's religion.\n";
e += moveEffect(`${PK}_move_rite_effect`, relBranches(rels));
if (!PACK) e += FIX_OLD;
write(`common/scripted_effects/zz_${PK}_effects.txt`, e);

if (perFaith.length) {
  // Same file names as the base mod: they replace its faiths and its move effect.
  const baseRels = vanillaReligions.map(x => x[0]).filter(r => byRel.has(r));
  const baseFaiths = baseRels.map(r => styleFaiths(st => `sacra_${r}_${st}_style`, r, ...baseFaith(r)).join('\n\n')).join('\n\n');
  const OH = HEAD + `# Replaces the file of the same name in ${BASE_NAME}: same faiths, built with the faiths of ${PACK[2]}.\n\n`;
  write('common/religion/faith_types/zz_sacra_faiths.txt', OH + baseFaiths + '\n');
  const own = perFaith.map(([rel, fk]) => [
    'OR = { ' + [`this = faith:${fk}`].concat(STYLE_KEYS.map(st => `this = faith:${PK}_${fk}_${st}_style`)).join(' ') + ' }',
    `faith:${PK}_${fk}_$STYLE$_style`]);
  write('common/scripted_effects/zz_sacra_effects.txt', OH +
    "# A rite of a faith of a replaced religion goes to the style faith of its own faith (its own gods).\n" +
    moveEffect('sacra_move_rite_effect', own.concat(relBranches(baseRels))) + FIX_OLD);
}

const DK = `${PK}_choose_sacred_architecture_decision`;
let items = '', apply = '';
for (const [key, icon] of STYLES) {
  items += `
		item = {
			value = sacra_style_${key}
			localization = sacra_style_${key}
			current_description = sacra_style_${key}_desc
			icon = "gfx/interface/icons/faith/${icon}.dds"
			flat = no
			is_shown = {
				faith = { NOT = { has_graphical_faith = ${key}_gfx } }
			}
			ai_chance = { value = 0 }
		}
`;
  apply += `		else_if = {
			limit = { scope:sacra_style_${key} = yes }
			${PK}_move_rite_effect = { STYLE = ${key} }
		}
`;
}
apply = apply.replace('\t\telse_if', '\t\tif');
const d = HEAD + `${DK} = {
	picture = {
		reference = "gfx/interface/illustrations/decisions/decision_personal_religious.dds"
	}
	decision_group_type = religious
	sort_order = 90
	ai_check_interval = 0

	desc = ${DK}_desc
	selection_tooltip = ${DK}_tooltip

	cooldown = { years = 10 }

	is_shown = {
		is_ai = no
		is_landed = yes
		${PK}_supported_religion_trigger = yes
	}

	is_valid = {
		custom_tooltip = {
			text = sacra_req_rite_leader
			sacra_can_reform_rite_trigger = yes
		}
	}

	is_valid_showing_failures_only = {
		is_imprisoned = no
		is_at_war = no
	}

	cost = {
		piety = major_piety_value
	}

	widget = {
		gui = "decision_view_widget_option_list_generic"
		controller = decision_option_list_controller
		decision_to_second_step_button = "sacra_choose_sacred_architecture_next_step"
		show_from_start = yes
${items}	}

	effect = {
		save_scope_as = sacra_reformer
		rite = { save_scope_as = sacra_rite }
		faith = { save_scope_as = sacra_old_faith }
		custom_tooltip = sacra_choose_sacred_architecture_effect_tt
		hidden_effect = {
${apply}			sacra_fix_old_faith_effect = yes
		}
	}

	ai_potential = { always = no }
	ai_will_do = { base = 0 }
}
`;
write(`common/decisions/zz_${PK}_decisions.txt`, d);

const locf = (lang, rows) => `l_${lang}:\n` + rows.map(([k, v]) => ` ${k}:0 "${v}"\n`).join('');
let en, fr;
if (PACK) {
  const B = 'sacra_choose_sacred_architecture_decision';
  en = ['', '_desc', '_tooltip', '_confirm'].map(s => [DK + s, `$${B}${s}$`]);
  fr = en.slice();
} else {
  en = [
    ['sacra_choose_sacred_architecture_decision', 'Choose a Sacred Architecture'],
    ['sacra_choose_sacred_architecture_decision_desc', 'Our temples need not look like those of our ancestors. We can raise cathedrals, mosques, pagodas or fire temples in honour of our faith, if we have the authority to reshape it.\\n\\n#weak Your rite and all its followers (characters and counties) move into a new faith of the same religion that uses the chosen temple style. Your doctrines, tenets and rite name are kept.#!'],
    ['sacra_choose_sacred_architecture_decision_tooltip', 'Pick the temple style of your faith'],
    ['sacra_choose_sacred_architecture_decision_confirm', 'Consecrate the new temples'],
    ['sacra_choose_sacred_architecture_next_step', 'Choose this style'],
    ['sacra_req_rite_leader', 'You are the Head of your Rite or the Head of your Faith'],
    ['sacra_choose_sacred_architecture_effect_tt', 'Your rite and all its followers join the faith of the chosen temple style (same religion, same doctrines and tenets). Temples on the map change their look: if they do not right away, save and reload your game.'],
  ];
  fr = [
    ['sacra_choose_sacred_architecture_decision', 'Choisir une architecture sacrée'],
    ['sacra_choose_sacred_architecture_decision_desc', "Nos temples n'ont pas à ressembler à ceux de nos ancêtres. Nous pouvons élever des cathédrales, des mosquées, des pagodes ou des temples du feu en l'honneur de notre foi, si nous avons l'autorité pour la façonner.\\n\\n#weak Votre rite et tous ses fidèles (personnages et comtés) rejoignent une nouvelle foi de la même religion, qui utilise le style de temple choisi. Vos doctrines, préceptes et le nom de votre rite sont conservés.#!"],
    ['sacra_choose_sacred_architecture_decision_tooltip', 'Choisir le style des temples de votre foi'],
    ['sacra_choose_sacred_architecture_decision_confirm', 'Consacrer les nouveaux temples'],
    ['sacra_choose_sacred_architecture_next_step', 'Choisir ce style'],
    ['sacra_req_rite_leader', 'Vous êtes le chef de votre rite ou le chef de votre foi'],
    ['sacra_choose_sacred_architecture_effect_tt', "Votre rite et tous ses fidèles rejoignent la foi au style de temple choisi (même religion, mêmes doctrines et préceptes). Les temples de la carte changent d'apparence : si ce n'est pas immédiat, sauvegardez et rechargez la partie."],
  ];
  for (const [key, , enOpt, , frOpt] of STYLES) {
    en.push([`sacra_style_${key}`, enOpt], [`sacra_style_${key}_desc`, `Temples of your faith will look like ${enOpt.toLowerCase()}.`]);
    fr.push([`sacra_style_${key}`, frOpt], [`sacra_style_${key}_desc`, `Les temples de votre foi ressembleront à : ${frOpt.toLowerCase()}.`]);
  }
}
for (const r of rels) for (const [key, , enOpt, enWord, frOpt, frWord] of STYLES) {
  const f = `sacra_${r}_${key}_style`;
  en.push([f, `$${r}_adj$ ${enWord} Tradition`], [f + '_adj', `$${r}_adj$`], [f + '_adherent', `$${r}_adherent$`], [f + '_adherent_plural', `$${r}_adherent_plural$`], [f + '_desc', `A branch of $${r}$ whose followers worship in ${enOpt.toLowerCase()}.`]);
  fr.push([f, `Tradition ${frWord} ($${r}$)`], [f + '_adj', `$${r}_adj$`], [f + '_adherent', `$${r}_adherent$`], [f + '_adherent_plural', `$${r}_adherent_plural$`], [f + '_desc', `Une branche de la religion « $${r}$ » dont les fidèles prient dans des lieux de culte de style : ${frOpt.toLowerCase()}.`]);
}
for (const [, fk] of perFaith) for (const [key, , enOpt, enWord, frOpt, frWord] of STYLES) {
  const f = `${PK}_${fk}_${key}_style`;
  en.push([f, `$${fk}_adj$ ${enWord} Tradition`], [f + '_adj', `$${fk}_adj$`], [f + '_adherent', `$${fk}_adherent$`], [f + '_adherent_plural', `$${fk}_adherent_plural$`], [f + '_desc', `A branch of $${fk}$ whose followers worship in ${enOpt.toLowerCase()}.`]);
  fr.push([f, `Tradition ${frWord} ($${fk}$)`], [f + '_adj', `$${fk}_adj$`], [f + '_adherent', `$${fk}_adherent$`], [f + '_adherent_plural', `$${fk}_adherent_plural$`], [f + '_desc', `Une branche de la foi « $${fk}$ » dont les fidèles prient dans des lieux de culte de style : ${frOpt.toLowerCase()}.`]);
}
write(`localization/english/zz_${PK}_l_english.yml`, locf('english', en));
write(`localization/french/zz_${PK}_l_french.yml`, locf('french', fr));

const deps = PACK ? `dependencies={\n\t"${BASE_NAME}"\n\t"${PACK[2]}"\n}\n` : '';
const desc = `version="${VERSION}"\ntags={\n\t"Gameplay"\n\t"Religion"\n\t"Decisions"\n\t"Graphics"\n}\nname="${NAME}"\n${deps}supported_version="1.20.*"\n`;
write('descriptor.mod', desc, false);
console.log('ok', rels.length, 'religions,', perFaith.length, 'faiths of replaced religions,', (rels.length + perFaith.length) * STYLE_KEYS.length, 'style faiths');
fs.writeFileSync(OUT.replace(/[\\/]+$/, '') + '.mod', desc + `path="mod/${FOLDER}"\n`, 'utf8');
console.log('Done:', OUT);
