# ASCII Racing

Corrida de combate em **visão isométrica**, desenhada com **caracteres ASCII** — inspirada em *Rock'n Roll Racing*.
Roda no navegador (HTML + JavaScript + canvas), sem build e sem dependências.

## Como jogar
Corra 3 voltas contra 3 adversários, pegue itens na pista e use armas para destruí-los.

| Tecla | Ação |
|---|---|
| Setas / WASD | Dirigir |
| Espaço | Disparar míssil teleguiado |
| X | Soltar mina |
| Shift | Nitro |
| Enter | Começar / recomeçar |
| P | Pausa |
| M | Som on/off |
| Q | Qualidade (Alta / Média / Baixa) |
| F | Mostra FPS, zoom e qualidade |
| `+` / `-` | Densidade do ASCII (caracteres menores / maiores) |
| `,` / `.` | Zoom da câmera (afasta / aproxima) — `0` volta ao padrão |

Itens na pista: **[M]** mísseis, **[X]** minas, **[N]** nitro, **[+]** reparo.

## Rodar localmente
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```
(Abrir o `index.html` direto também pode funcionar, mas o recomendado é usar um servidor local.)

## Publicar no GitHub Pages
O jogo é 100% estático. No repositório: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
O endereço fica `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.

## Estrutura
```
index.html          carrega os scripts
js/game.js          lógica do jogo, terreno, câmera e renderização
sprites/            a arte (cada coisa no seu arquivo) — veja sprites/LEIAME.md
  car.js            modelo 3D do carro (caixas)
  props.js          itens, minas e míssil
  terrain.js        pista, zebra, muro, grama, árvores
  iso.js            motor: modelo 3D -> isométrico -> ASCII
  baked.js          carrega os carros pré-gerados
  baked/            PNGs dos carros (gerados por tools/bake.html)
tools/
  bake.html         gera os sprites dos carros em PNG
  save_server.py    servidor local que grava os PNGs do bake
```

## Refazer os sprites dos carros
Depois de mexer em `sprites/car.js` (formato ou cores):
1. `python3 -m http.server 8123` e, em outro terminal, `python3 tools/save_server.py`
2. Abra `http://127.0.0.1:8123/tools/bake.html` e espere aparecer **PRONTO**.
3. Recarregue o jogo.

Detalhes e parâmetros em [`sprites/LEIAME.md`](sprites/LEIAME.md).
