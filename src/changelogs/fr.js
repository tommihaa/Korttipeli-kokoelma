// Muutosloki — ranska. Konekäännös fi.js:stä (auto-taso). Rakenteen on vastattava fi.js:ää 1:1.
export const CHANGELOG = [
  {
    date: '11.6.2026',
    items: [
      'Le journal des modifications s\'affiche désormais dans ta langue — tout l\'historique a été traduit dans les 17 langues.',
      'Nouveau réglage : jeu de cartes bicolore (♠ et ♣ noirs, ♥ et ♦ rouges). Le choix est mémorisé comme la langue et les sons.',
      'Nouveau guide dans le panneau Info : comment ajouter le jeu à l\'écran d\'accueil ou au bureau — il s\'ouvre comme une appli.',
      'Les icônes de cartes de Maija et Kasino s\'affichent désormais correctement sur tous les appareils.',
    ],
  },
  {
    date: '10.6.2026',
    items: [
      'L\'application s\'ouvre maintenant nettement plus vite : les langues et le journal des modifications ne sont chargés qu\'au besoin, le premier chargement est ainsi allégé d\'environ 70 %.',
      'Le jeu t\'accompagne désormais même sans réseau : les jeux et les langues déjà ouverts fonctionnent hors ligne — même au chalet sans couverture.',
    ],
  },
  {
    date: '9.6.2026',
    items: [
      'La présentation est maintenant lisible dans toutes les langues, pas seulement en finnois.',
      'Nouveau bouton Partager dans le menu : partage le lien du jeu avec un ami en un seul geste.',
    ],
  },
  {
    date: '7.6.2026',
    items: [
      'Tu peux maintenant donner ton avis de deux façons : note la collection via le formulaire ou envoie tes critiques et compliments directement par e-mail — comme tu préfères.',
    ],
  },
  {
    date: '7.6.2026',
    items: [
      'Le retour d\'expérience a été repensé : un formulaire d\'avis intégré au jeu, où tu peux donner une note et des suggestions d\'amélioration. À trouver dans la section Présentation du panneau Info (ℹ).',
      'Si tu le souhaites, tu peux soutenir le jeu sur Ko-fi — un petit lien de soutien à côté du formulaire d\'avis. Pas de pub, aucune obligation.',
      'Les réglages de langue et de son sont maintenant mémorisés entre les visites. Les autres paramètres reviennent aux valeurs par défaut comme avant.',
      'Nouveau groupe d\'adversaires Goa\'uld (les System Lords de Stargate). Le groupe des dieux de la fortune a accueilli de nouveaux membres : Onnetar, Macuilxochitl et Felicitas.',
      'Chaque groupe d\'adversaires a maintenant une petite description, et lors de la première visite, le gang des Memes est choisi comme adversaires.',
      'La présentation a été clarifiée : nous disons maintenant clairement que le jeu n\'utilise ni cookies, ni comptes, ni e-mail, ni publicité — et que seuls les réglages de langue et de son sont enregistrés dans ton propre navigateur.',
    ],
  },
  {
    date: '5.6.2026',
    items: [
      'Deux langues de plus : le portugais et le carélien — l\'application est maintenant en 17 langues. Le carélien (carélien propre) est une traduction expérimentale, elle se trouve donc dans le groupe « non testées » du menu des langues. De plus, le sélecteur de langue a été déplacé en haut, à côté des boutons Info et Paramètres, sous forme de menu de drapeaux compact.',
    ],
  },
  {
    date: '5.6.2026',
    items: [
      'Trois nouvelles langues : le grec, le polonais et l\'estonien — l\'application est maintenant en 15 langues. Le choix de la langue se fait désormais via un menu déroulant épuré (sous la liste des jeux), où les langues sont groupées : testées (finnois natif ✓, les autres vérifiées « web ») et non testées dans leur propre groupe. Le polonais a reçu des noms de jeux établis (Seiska → Makao, Maija → Piotruś, Moska → Dureń), l\'estonien aussi (Maija → Must Peeter).',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Le choix de la langue a été déplacé du panneau Info directement dans le menu principal (sous la liste des jeux). Les langues sont groupées par niveau de vérification : le finnois est natif (✓), les autres sont marquées « web », c\'est-à-dire que les noms des jeux ont été vérifiés par recherche web mais pas encore par un locuteur natif. Quelques noms de jeux ont aussi été corrigés (en espagnol Ristiseiska → Cinquillo, en islandais Seiska → Olsen Olsen, Paskahousu → Skítakall).',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Les noms des jeux du menu sont maintenant adaptés à chaque langue ! Dans chaque langue, sous le nom du jeu apparaît désormais son équivalent établi dans la culture des jeux de cartes correspondante — p. ex. Moska est « Durak » en allemand, en suédois on voit Paskahousu → « Skitgubbe », Seiska → « Mau-Mau », Kasino → « Cassino ». Quand il n\'existe pas de nom établi, une courte description dans la langue concernée le remplace. En finnois, les jeux restent sans sous-titre.',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Dix nouvelles langues ! L\'application fonctionne maintenant, en plus du finnois et de l\'anglais, en suédois, norvégien, danois, islandais, allemand, français, espagnol, italien, ukrainien et russe — soit 12 langues au total. La langue est détectée depuis le navigateur et peut être changée dans le menu de drapeaux du panneau Info. Les menus, les descriptions et règles des jeux, le glossaire ainsi que tous les messages et conseils en cours de partie ont été traduits.',
      'Les noms propres des jeux (Moska, Seiska, Kasino…) restent familiers dans toutes les langues — les équivalents établis de chaque langue seront peaufinés plus tard.',
    ],
  },
  {
    date: '3.6.2026',
    items: [
      'Menu : en mode anglais, l\'équivalent international apparaît maintenant sous le nom du jeu (p. ex. Kasino → « Classic Cassino », Moska → « a Finnish Durak variant », Paskahousu → « Finnish Palace variant ») — les jeux familiers sont plus faciles à reconnaître',
    ],
  },
  {
    date: '3.6.2026',
    items: [
      'Choix de la langue : l\'application est maintenant entièrement utilisable aussi en anglais — menus, descriptions et règles des jeux, glossaire ainsi que les messages d\'événements et conseils en cours de partie. La langue est détectée depuis le navigateur et peut être changée via le bouton FI | EN du panneau Info',
      'Kasino : à ton tour, la carte qui capture le plus de points se déplace au bord gauche de ta main — le meilleur coup est plus facile à repérer',
      'Kasino : le message du journal annonçant une construction montre maintenant aussi les cartes utilisées (p. ex. « construit un assemblage (5♣ + 4♦) — valeur 9 »)',
      'Ristiseiska : quand tu renverses la pile et peux continuer, le texte du bouton est maintenant plus clair : « Je ne continue pas » (avant « Terminer »)',
    ],
  },
  {
    date: '2.6.2026',
    items: [
      'Accessibilité : les cartes, les pioches et les boutons peuvent maintenant aussi s\'utiliser au clavier (navigation Tab, Entrée ou espace pour jouer) et l\'élément ciblé reçoit une bordure dorée bien visible — on peut jouer sans souris',
      'Accessibilité : le lecteur d\'écran lit maintenant les noms des cartes (p. ex. « pique 7 ») et annonce les événements de la partie à voix haute dans chaque jeu',
      'Accessibilité : si le réglage « réduire les animations » est activé sur l\'appareil, le jeu le respecte et ne joue pas les animations',
      'Ouverture plus rapide : le premier chargement de l\'application a été allégé d\'environ moitié — le code de chaque jeu n\'est chargé qu\'à l\'ouverture du jeu',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Réglages par défaut : sons coupés et journal des événements ouvert par défaut (même sur un écran de la taille d\'un téléphone)',
      'Les conseils (p. ex. au Seiska « joue la couleur ♠ ou un 4 ») sont maintenant toujours affichés — l\'interrupteur séparé du mode apprentissage a été supprimé',
      'Koputus : sons manquants ajoutés — pioche, échange, défausse, toc, révélation des cartes et victoire retentissent maintenant aussi pendant les tours de l\'IA (le jeu était presque muet auparavant)',
      'Seiska : bug corrigé où « Lappu » n\'était pas exigé quand la main était revenue à une seule carte après des cartes de pénalité ou la sanction de l\'as — Lappu est maintenant toujours exigé en arrivant à une carte',
      'Ristiseiska : quand tu donnes une carte de gage au passeur, le choix est maintenant confirmé par un bouton « Donner » séparé — plus de dons accidentels en un seul clic. Le journal du gage aléatoire a été reformulé pour être plus lisible',
      'Paskahousu : deux nouvelles options pour le seuil minimal de la figure — « 0 » (une figure peut être posée sur n\'importe quelle carte non spéciale) et « 6 »',
      'Läpsy : messages de défi clarifiés — « a transmis le défi avec la carte X » et « défie avec la carte X le joueur Y » (moins de répétitions, plus clair qui défie qui)',
      'Nettoyage interne : suppression de la collecte Momentti inutilisée (outil de retour du développeur + localStorage) et de la vue Admin inaccessible qui y était liée dans tous les jeux — aucun effet sur le jeu',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Nettoyage interne : la nomenclature des niveaux d\'IA a été unifiée (suppression du vestige obsolète « Surnaturel » dans le code, déjà fusionné dans le niveau Maître) et le code mort qu\'il laissait a été élagué — aucun changement dans le fonctionnement du jeu. Les documents de règles propres aux jeux (Seiska, Paskahousu) ont été mis à jour pour refléter les trois niveaux d\'IA',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Seiska : quand tu ne peux pas jouer, tu dois piocher (3 au maximum) — suppression du bouton erroné « Terminer le tour » qui permettait de passer en pleine pioche. Après la troisième pioche, le tour passe toujours automatiquement ; tu peux quand même garder une carte piochée jouable et continuer à piocher (as/changement de couleur comme tactique)',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'La pioche est maintenant affichée de façon uniforme dans tous les jeux : le terme « PIOCHE » et le nombre de cartes à côté de la Table (le « TALON » de Koputus et Kultakala → « PIOCHE » ; Kultakala montre maintenant aussi l\'état « VIDE ! »)',
      'Le repère du dernier coup flotte maintenant au-dessus de la table au lieu d\'occuper sa propre ligne — affichage plus compact, surtout sur téléphone',
      'Nettoyage interne : les vues Table et pioche partagées en composants communs ; code en double supprimé et deux animations « pioche épuisée » différentes fusionnées en une seule',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Paskahousu : messages de sortie différenciés selon le classement (victoire 🏆 / a quitté la partie 👏 / est resté Paskahousu 💩) — plus de « a remporté la victoire » répété',
      'Paskahousu : bug corrigé où un adversaire jouait un 10/A sur une table vide et l\'échangeait contre une carte plus petite, mais le joueur suivant perdait quand même son tour',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Le Combat de bots lance maintenant autant de bots que le nombre de joueurs choisi dans tous les jeux (plus toujours 4) ; le texte du bouton suit la sélection (« 3 bots »)',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Ristiseiska, Moska, Maija, Kultakala et Paskahousu : les cartes des adversaires réduites à la taille du Seiska (xsmall) — elles tiennent mieux à l\'écran sur téléphone, surtout en mode Combat de bots',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Ristiseiska : nouvelle option de règle sur l\'écran de départ — carte de gage « Choisie » (standard : le joueur précédent choisit la carte) ou « Aléatoire » (la carte est tirée au sort dans la main du donneur)',
      'Paskahousu : dans le bouton « deux durs », ♠2 ♣2 apparaissent maintenant aux couleurs des enseignes (pique noir, trèfle vert) — plus clair ce que signifie la règle standard',
      'Menu : l\'icône de Maija est maintenant une mini-carte Q♠ bien lisible et celle de Kasino une pièce d\'or 🪙 (les anciens glyphes de cartes sombres se voyaient mal)',
      'Kasino : l\'estimation du risque de défausse de l\'IA prend maintenant aussi en compte les captures ♠2 et ♦10 (peaufinage interne)',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Menu : Info séparé en panneau dédié (bouton ℹ à côté de l\'engrenage) — Paramètres ne contient plus que les valeurs modifiables, Info les textes à lire (Présentation, Glossaire et symboles, Journal des modifications, À venir)',
      'Options de règles propres à chaque jeu sur l\'écran de départ (à côté du nombre de joueurs)',
      'Paskahousu : taille de main 5/6 · deux durs — boutons « Tous » (tous les 2 = 15) ou « ♠2 ♣2 » (standard : seuls les deux noirs sont durs, ♥2/♦2 normaux) · seuil minimal de la figure 7/8/9',
      'Kasino : autoriser les constructions spéciales pour les valeurs 14–16 (A = 14, ♠2 = 15, ♦10 = 16)',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Moska : le journal de fin de partie unifié au style de Maija — « X a quitté la partie 👏 » et « X a perdu. » (conjugaison maladroite supprimée)',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Version 0.3 — l\'ensemble Combat de bots est terminé 🎉',
      'IA : Maija joue maintenant la carte Maija (♠Q) avec les piques ; Seiska sait gagner avec la chaîne bonus de l\'as (l\'as d\'abord, la carte piochée ensuite)',
      'Kasino (Combat de bots) : le nom du propriétaire de la construction est visible en mode spectateur (plus de « la mienne ») ; entre les manches, le spectateur avance avec le bouton « Partie suivante → »',
      'Koputus (Combat de bots) : la carte d\'intention est maintenant visible en entier',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Le nombre de joueurs se choisit uniquement sur l\'écran de départ du jeu (réglage en double supprimé des Paramètres)',
      'La barre du mode spectateur (réglage du tempo) est maintenant dans les 9 jeux — y compris Läpsy, Ristiseiska et Paskahousu',
      'Message de tour unifié : « Au tour de X. » dans tous les jeux au tour par tour',
      'Messages d\'événements unifiés à la troisième personne (base pour les versions linguistiques)',
      'Ristiseiska : l\'effet de la carte jouée apparaît dans le journal (p. ex. « ouvre la couleur », « la pile basse ne s\'ouvre pas encore »)',
      'Combat de bots : corrigé des endroits où un bot était interpellé comme un joueur',
      'Seiska : hauteur de la ligne Combat de bots — la carte d\'intention n\'est plus coupée',
      'Nettoyage interne : la sauvegarde Momentti peu utilisée supprimée de Moska, orthographe corrigée',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Barre du mode spectateur unifiée : le même réglage de tempo dans tous les jeux (les boutons +/− du Seiska remplacés par un curseur)',
      'Nettoyage interne : code mort supprimé, la création du paquet de cartes et la barre du mode spectateur partagées en modules communs',
      'Le mode conseil stratégique (teachMode) entièrement supprimé',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Combat de bots : le niveau d\'IA suit le niveau choisi dans les Paramètres (Apprenti/Compagnon/Maître)',
      'Le bouton Combat de bots affiche le niveau choisi dynamiquement',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Les niveaux d\'IA renommés : Apprenti · Compagnon · Maître',
      'Paramètres : toutes les sections fermées par défaut, elles s\'ouvrent d\'un geste',
      'Paramètres : sections Journal des modifications et À venir ajoutées',
      'La commande /deploy met à jour le Journal des modifications automatiquement',
    ],
  },
  {
    date: '28.5.2026',
    items: [
      'Paramètres : « Montrer toutes les cartes » et le réglage du jeu de mémoire masqués en mode Combat de bots',
      'Le bouton « Combat de bots » affiche « Maître » — les 9 jeux',
      'Le bouton de la vue debug renommé « Cartes ouvertes » — les 9 jeux',
      'Replay : les symboles de cartes colorés s\'affichent correctement dans le journal',
      'Seiska : bugs de la barre du mode spectateur et du bonus d\'as de l\'IA corrigés',
    ],
  },
  {
    date: '27.5.2026',
    items: [
      'Combat de bots : le journal des événements et les statuts des joueurs sont visibles pendant la partie',
      'Kultakala : allBots — le joueur 0 n\'apparaît plus parmi les autres bots',
    ],
  },
  {
    date: '26.5.2026',
    items: [
      'Combat de bots : retour en arrière — parcours chaque coup à rebours',
      'Améliorations AllBots : messages de tour, mélange du paquet, changement de couleur de l\'IA',
      'Niveaux d\'IA, 3 au total : Apprenti · Compagnon · Maître',
    ],
  },
  {
    date: '25.5.2026',
    items: [
      'Paskahousu : inférence de l\'IA, mort subite, messages améliorés',
      'Mode spectateur AllBots : cartes jouables mises en évidence, ordre unifié',
    ],
  },
];
