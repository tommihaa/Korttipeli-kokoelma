/// <reference types="vite/client" />

// Buildin aikana korvattavat vakiot. Arvot tulevat vite.config.js:n define-lohkosta,
// eli niitä ei ole olemassa ajonaikaisena globaalina vaan ne kirjoitetaan bundleen
// suoraan. Ilman tätä ilmoitusta tyyppitarkistus lukee ne tuntemattomiksi nimiksi.
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __BUILD_TIME__: string;
