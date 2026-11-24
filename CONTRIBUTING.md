# Contributing to ASCII Racing

Thanks for wanting to help. *(Resumo em português no final.)*

Code comments are currently in **Brazilian Portuguese**. The game itself is available in English, Portuguese, Spanish, French and German
(all player-facing text lives in `js/i18n.js`). Issues and pull requests are welcome in English or Portuguese.

## Quick start

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Playing locally needs no install and no build. Use the `F` key in the game to see the FPS, zoom and quality.

## How we work

- Keep the game playable in the browser on GitHub Pages by opening `index.html`. Players still need no install and no build. CI copies those files into `dist/` and publishes that folder.
- Do not add a runtime dependency without a written reason in the commit. Dev dependencies used only by CI belong in the root `package.json`.
- Keep each kind of art in its own file under `sprites/`, and keep game logic in `js/game.js`.
- Never hard-code player-facing text: add the key to **all five** languages in `js/i18n.js` and use `t('key', ...)`. Native-speaker corrections to the translations are very welcome.
- If you change the car model or colours in `sprites/car.js`, rebuild the sprite sheets (see the README, "Rebuilding the car sprites") and commit the new files in `sprites/baked/`. Without them the game falls back to a slower, real-time path.
- The game must stay smooth on modest hardware: avoid per-frame allocations and per-character draw calls in the render loop. Heavy work belongs in chunk generation or in the pre-baked sprites.

## Testing

CI runs `pnpm check` (syntax and the Pages build) and `pnpm test:e2e` (Playwright, Chromium). Before opening a pull request, also play at least one full lap, at the default zoom and at one other zoom (`,` / `.`), and check that the browser console shows no errors. Include a screenshot if you changed how something looks.

## Licensing

By contributing you agree that your work is released under the [GNU AGPL-3.0](LICENSE), the same license as the rest of the project.

---

## Resumo em português

- O jogo precisa continuar rodando direto no navegador, pelo GitHub Pages, abrindo o `index.html`. Quem joga não instala nada e não faz build. O CI copia esses arquivos para `dist/` e publica essa pasta.
- Não adicione dependências de execução sem justificar no commit. Dependências usadas só pelo CI ficam no `package.json` da raiz.
- Cada tipo de arte fica no seu arquivo em `sprites/`; a lógica fica em `js/game.js`.
- Nunca escreva texto do jogo direto no código: crie a chave nos **cinco** idiomas em `js/i18n.js` e use `t('chave', ...)`. Correções de falantes nativos nas traduções são muito bem-vindas.
- Se mexer no carro (`sprites/car.js`), refaça os sprites pré-gerados e envie os novos arquivos de `sprites/baked/`.
- O CI roda `pnpm check` (sintaxe e o build do Pages) e `pnpm test:e2e` (Playwright, Chromium). Antes do pull request, jogue também ao menos uma volta completa em dois zooms e confira se o console não mostra erros.
- Ao contribuir, você concorda em licenciar seu trabalho sob a AGPL-3.0.
