/* =====================================================================
   js/i18n.js  —  TRADUÇÕES DO JOGO
   Idiomas: en, pt, es, fr, de. O idioma é detectado pelo navegador, lembrado em
   localStorage e pode ser trocado com a tecla L.

   Para adicionar um texto: crie a chave nos 5 idiomas e use t('chave', arg0, arg1...).
   {0}, {1}... são substituídos pelos argumentos. As chaves 'q0','q1','q2' são os nomes dos
   presets de qualidade (ver QUALITY em js/game.js).
   ===================================================================== */
const I18N = {
  langs: ['en', 'pt', 'es', 'fr', 'de'],
  names: { en: 'English', pt: 'Português', es: 'Español', fr: 'Français', de: 'Deutsch' },
  lang: 'en',

  dict: {
    en: {
      lap: 'LAP {0}/{1}', pos: 'POS {0}/{1}', time: 'TIME {0}', health: 'HEALTH',
      missiles: 'MISSILES', mines: 'MINES', nitro: 'NITRO',
      keySpace: 'SPACE', keyArrows: 'ARROWS',
      wrongWay: '<< WRONG WAY >>', destroyed: 'DESTROYED!  Respawning...', paused: 'PAUSED',
      subtitle: 'COMBAT RACING', pressEnter: '>>> PRESS  ENTER  TO RACE <<<',
      ctrlDrive: 'drive', ctrlMissile: 'fire a homing missile', ctrlMine: 'drop a mine', ctrlNitro: 'nitro',
      sysKeys: 'M sound  P pause  Q quality  F FPS/info  L language  + / - density  , / . zoom (0 = default)',
      itemsLine: 'TRACK ITEMS:  [M] missile   [X] mine   [N] nitro   [+] repair',
      finishMsg: 'You finished in {0} place!', racing: 'racing...', again: 'ENTER to race again',
      fpsLine: 'ZOOM {0}x   QUALITY {1}   ASCII {2}   chunks {3}',
      q0: 'HIGH', q1: 'MEDIUM', q2: 'LOW',
      msgQuality: 'Quality: {0}', msgQualityAuto: 'Quality lowered automatically', msgDensityAuto: 'ASCII density lowered',
      msgZoom: 'Zoom {0}x', zoomDefault: '(default)', msgLang: 'Language: {0}',
      killed: '{0} destroyed {1}', exploded: '{0} exploded', finishedLog: '{0} finished {1}',
      youKilled: 'YOU destroyed {0}', killedYou: '{0} destroyed YOU', youExploded: 'YOU exploded', youFinished: 'YOU finished {0}',
      you: 'YOU', pickM: '+3 MISSILES', pickN: '+1 NITRO', pickX: '+3 MINES', pickRepair: 'REPAIR',
    },
    pt: {
      lap: 'VOLTA {0}/{1}', pos: 'POS {0}/{1}', time: 'TEMPO {0}', health: 'VIDA',
      missiles: 'MÍSSEIS', mines: 'MINAS', nitro: 'NITRO',
      keySpace: 'ESPAÇO', keyArrows: 'SETAS',
      wrongWay: '<< CONTRAMÃO >>', destroyed: 'DESTRUÍDO!  Reaparecendo...', paused: 'PAUSADO',
      subtitle: 'CORRIDA DE COMBATE', pressEnter: '>>> PRESSIONE  ENTER  PARA CORRER <<<',
      ctrlDrive: 'dirigir', ctrlMissile: 'disparar míssil teleguiado', ctrlMine: 'soltar mina', ctrlNitro: 'nitro',
      sysKeys: 'M som  P pausa  Q qualidade  F FPS/info  L idioma  + / - densidade  , / . zoom (0 = padrão)',
      itemsLine: 'ITENS NA PISTA:  [M] míssil   [X] mina   [N] nitro   [+] reparo',
      finishMsg: 'Você ficou em {0} lugar!', racing: 'em corrida...', again: 'ENTER para correr novamente',
      fpsLine: 'ZOOM {0}x   QUALIDADE {1}   ASCII {2}   blocos {3}',
      q0: 'ALTA', q1: 'MÉDIA', q2: 'BAIXA',
      msgQuality: 'Qualidade: {0}', msgQualityAuto: 'Qualidade reduzida automaticamente', msgDensityAuto: 'Densidade do ASCII reduzida',
      msgZoom: 'Zoom {0}x', zoomDefault: '(padrão)', msgLang: 'Idioma: {0}',
      killed: '{0} destruiu {1}', exploded: '{0} explodiu', finishedLog: '{0} terminou em {1}',
      youKilled: 'VOCÊ destruiu {0}', killedYou: '{0} destruiu VOCÊ', youExploded: 'VOCÊ explodiu', youFinished: 'VOCÊ terminou em {0}',
      you: 'VOCÊ', pickM: '+3 MÍSSEIS', pickN: '+1 NITRO', pickX: '+3 MINAS', pickRepair: 'REPARO',
    },
    es: {
      lap: 'VUELTA {0}/{1}', pos: 'POS {0}/{1}', time: 'TIEMPO {0}', health: 'VIDA',
      missiles: 'MISILES', mines: 'MINAS', nitro: 'NITRO',
      keySpace: 'ESPACIO', keyArrows: 'FLECHAS',
      wrongWay: '<< CONTRAMANO >>', destroyed: '¡DESTRUIDO!  Reapareciendo...', paused: 'PAUSA',
      subtitle: 'CARRERAS DE COMBATE', pressEnter: '>>> PULSA  ENTER  PARA CORRER <<<',
      ctrlDrive: 'conducir', ctrlMissile: 'disparar un misil teledirigido', ctrlMine: 'soltar una mina', ctrlNitro: 'nitro',
      sysKeys: 'M sonido  P pausa  Q calidad  F FPS/info  L idioma  + / - densidad  , / . zoom (0 = predeterminado)',
      itemsLine: 'OBJETOS EN PISTA:  [M] misil   [X] mina   [N] nitro   [+] reparación',
      finishMsg: '¡Has quedado en el puesto {0}!', racing: 'en carrera...', again: 'ENTER para correr de nuevo',
      fpsLine: 'ZOOM {0}x   CALIDAD {1}   ASCII {2}   bloques {3}',
      q0: 'ALTA', q1: 'MEDIA', q2: 'BAJA',
      msgQuality: 'Calidad: {0}', msgQualityAuto: 'Calidad reducida automáticamente', msgDensityAuto: 'Densidad de ASCII reducida',
      msgZoom: 'Zoom {0}x', zoomDefault: '(predeterminado)', msgLang: 'Idioma: {0}',
      killed: '{0} destruyó a {1}', exploded: '{0} explotó', finishedLog: '{0} terminó en el puesto {1}',
      youKilled: 'Has destruido a {0}', killedYou: '{0} te ha destruido', youExploded: 'Has explotado', youFinished: 'Has terminado en el puesto {0}',
      you: 'TÚ', pickM: '+3 MISILES', pickN: '+1 NITRO', pickX: '+3 MINAS', pickRepair: 'REPARACIÓN',
    },
    fr: {
      lap: 'TOUR {0}/{1}', pos: 'POS {0}/{1}', time: 'TEMPS {0}', health: 'VIE',
      missiles: 'MISSILES', mines: 'MINES', nitro: 'NITRO',
      keySpace: 'ESPACE', keyArrows: 'FLÈCHES',
      wrongWay: '<< SENS INTERDIT >>', destroyed: 'DÉTRUIT !  Réapparition...', paused: 'PAUSE',
      subtitle: 'COURSE DE COMBAT', pressEnter: '>>> APPUYEZ  SUR  ENTRÉE  POUR COURIR <<<',
      ctrlDrive: 'conduire', ctrlMissile: 'tirer un missile guidé', ctrlMine: 'poser une mine', ctrlNitro: 'nitro',
      sysKeys: 'M son  P pause  Q qualité  F FPS/infos  L langue  + / - densité  , / . zoom (0 = par défaut)',
      itemsLine: 'OBJETS SUR LA PISTE :  [M] missile   [X] mine   [N] nitro   [+] réparation',
      finishMsg: 'Vous finissez {0} !', racing: 'en course...', again: 'ENTRÉE pour rejouer',
      fpsLine: 'ZOOM {0}x   QUALITÉ {1}   ASCII {2}   blocs {3}',
      q0: 'HAUTE', q1: 'MOYENNE', q2: 'BASSE',
      msgQuality: 'Qualité : {0}', msgQualityAuto: 'Qualité réduite automatiquement', msgDensityAuto: 'Densité ASCII réduite',
      msgZoom: 'Zoom {0}x', zoomDefault: '(par défaut)', msgLang: 'Langue : {0}',
      killed: '{0} a détruit {1}', exploded: '{0} a explosé', finishedLog: '{0} termine {1}',
      youKilled: 'Vous avez détruit {0}', killedYou: '{0} vous a détruit', youExploded: 'Vous avez explosé', youFinished: 'Vous terminez {0}',
      you: 'VOUS', pickM: '+3 MISSILES', pickN: '+1 NITRO', pickX: '+3 MINES', pickRepair: 'RÉPARATION',
    },
    de: {
      lap: 'RUNDE {0}/{1}', pos: 'POS {0}/{1}', time: 'ZEIT {0}', health: 'LEBEN',
      missiles: 'RAKETEN', mines: 'MINEN', nitro: 'NITRO',
      keySpace: 'LEERTASTE', keyArrows: 'PFEILE',
      wrongWay: '<< FALSCHE RICHTUNG >>', destroyed: 'ZERSTÖRT!  Wiedereinstieg...', paused: 'PAUSE',
      subtitle: 'KAMPFRENNEN', pressEnter: '>>> ZUM LOSFAHREN  ENTER  DRÜCKEN <<<',
      ctrlDrive: 'fahren', ctrlMissile: 'Lenkrakete abfeuern', ctrlMine: 'Mine legen', ctrlNitro: 'Nitro',
      sysKeys: 'M Ton  P Pause  Q Qualität  F FPS/Info  L Sprache  + / - Dichte  , / . Zoom (0 = Standard)',
      itemsLine: 'ITEMS AUF DER STRECKE:  [M] Rakete   [X] Mine   [N] Nitro   [+] Reparatur',
      finishMsg: 'Du hast Platz {0} belegt!', racing: 'im Rennen...', again: 'ENTER für ein neues Rennen',
      fpsLine: 'ZOOM {0}x   QUALITÄT {1}   ASCII {2}   Blöcke {3}',
      q0: 'HOCH', q1: 'MITTEL', q2: 'NIEDRIG',
      msgQuality: 'Qualität: {0}', msgQualityAuto: 'Qualität automatisch verringert', msgDensityAuto: 'ASCII-Dichte verringert',
      msgZoom: 'Zoom {0}x', zoomDefault: '(Standard)', msgLang: 'Sprache: {0}',
      killed: '{0} hat {1} zerstört', exploded: '{0} ist explodiert', finishedLog: '{0} belegt Platz {1}',
      youKilled: 'Du hast {0} zerstört', killedYou: '{0} hat dich zerstört', youExploded: 'Du bist explodiert', youFinished: 'Du hast Platz {0} belegt',
      you: 'DU', pickM: '+3 RAKETEN', pickN: '+1 NITRO', pickX: '+3 MINEN', pickRepair: 'REPARATUR',
    },
  },

  // número ordinal ("1st", "2º", "1er"...) conforme o idioma
  ord(n) {
    switch (this.lang) {
      case 'en': { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
      case 'pt': return n + 'º';
      case 'fr': return n === 1 ? '1er' : n + 'e';
      default: return String(n);                      // es, de: só o número ("puesto 1", "Platz 1")
    }
  },

  t(key, ...args) {
    const d = this.dict[this.lang] || this.dict.en;
    let s = d[key] !== undefined ? d[key] : (this.dict.en[key] !== undefined ? this.dict.en[key] : key);
    args.forEach((a, i) => { s = s.split('{' + i + '}').join(a); });
    return s;
  },

  set(lang) {
    if (!this.dict[lang]) return;
    this.lang = lang;
    try { localStorage.setItem('asciiracing.lang', lang); } catch (e) {}
    try { document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang; } catch (e) {}
  },

  next() { this.set(this.langs[(this.langs.indexOf(this.lang) + 1) % this.langs.length]); },

  init() {
    let l = null;
    try { l = localStorage.getItem('asciiracing.lang'); } catch (e) {}
    if (!l || !this.dict[l]) {
      const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
      l = this.dict[nav] ? nav : 'en';
    }
    this.set(l);
  },
};
const t = (key, ...args) => I18N.t(key, ...args);
I18N.init();
