// ── Vastustajien nimiryhmät (jaettu data) ─────────────────────────────────────
// Botit nimetään valitusta ryhmästä. Aiemmin nämä asuivat App.jsx:ssä; siirretty
// jaettuun moduuliin, jotta sekä päävalikon asetukset että aloitusnäytön GroupPicker
// (ks. GroupPicker.jsx) käyttävät yhtä totuuden lähdettä. Labelit tulevat i18n:stä
// avaimella `ui.settings.groups.<key>`.

export const LAITURI_SPECIAL  = ['Antti','Arto','Arttu','Janus','Jens','Jokke','Juuso','Jukka','Kirsi','Markku','Marko','Markus','Marviel','Mika','Mikael','Osku','Panja','Rebekka','Sanna','Sari','Simo','Sune','Tarja','Teemu','Tinja'];
export const ONNEN_JUMALAT    = ['Vortumna','Loki','Fortuna','Tykhe','Onnetar','Macuilxochitl','Felicitas'];
export const IHMISTEN_PUOLUE  = ['Hannes','Päivi','Regina','Tapani (DI)','Topi-Petteri'];
export const KANSA            = ['Astraalitason tirehtööri','Jonne','Justiina','Kukkahattutäti','Lumihiutale','Rane','Setämies','Veeti'];
export const MEME_GANG        = ['Karen','Boomer','Zoomer','NPC','Random','Vegan','Nihilist','Chad','Prepper','Edgelord','Hipster','Influencer','Lurker','Tryhard','Noob','Troll','Crypto Bro','Main Character','AFK'];
export const GOAULD           = ['Ra','Apophis','Anubis','Ba\'al','Hathor','Cronus','Nirrti','Yu','Sokar','Osiris','Heru\'ur','Bastet','Camulus','Morrigan','Amaterasu','Svarog','Zipacna','Qetesh'];

// Järjestys = näyttöjärjestys valitsimissa. key vastaa i18n-avainta ja playerGroup-tilaa.
export const NAME_GROUPS = [
  { key: 'laituri', pool: LAITURI_SPECIAL },
  { key: 'jumalat', pool: ONNEN_JUMALAT  },
  { key: 'puolue',  pool: IHMISTEN_PUOLUE },
  { key: 'kansa',   pool: KANSA          },
  { key: 'meme',    pool: MEME_GANG      },
  { key: 'goauld',  pool: GOAULD         },
];

export const POOL_BY_GROUP = Object.fromEntries(NAME_GROUPS.map(g => [g.key, g.pool]));
