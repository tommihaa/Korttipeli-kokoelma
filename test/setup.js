// Vitest setup: aja ENNEN testitiedostojen importteja. Pakota navigator.language
// suomeksi, jotta i18n:n moduulitason `currentLang` (asetetaan importtihetkellä
// detectLang()-kutsusta) on deterministisesti 'fi' — testit voivat sitoutua
// suomalaisiin nappilabeleihin. jsdomin oletus olisi 'en-US'.
Object.defineProperty(globalThis.navigator, 'language', { value: 'fi-FI', configurable: true });
Object.defineProperty(globalThis.navigator, 'languages', { value: ['fi-FI'], configurable: true });
