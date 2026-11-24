# Sprites

Cada arte vive no seu arquivo. Edite, salve e recarregue a página (F5).

| Arquivo | O que controla |
|---|---|
| `car.js` | O carro: lista de caixas 3D (`model`), cores (`roles`), tamanho (`scale`) |
| `props.js` | Caixa de item (`pad`) e mina (`mine`) em **arte ASCII à mão**; míssil em caixas 3D |
| `terrain.js` | Asfalto, zebra, muros, torcida, grama e árvores (`tile()` e `tree`) |
| `iso.js` | Motor: gira/projeta os modelos em isométrico e converte para ASCII (raramente precisa mexer) |

## Modelo 3D (carro, míssil)
Cada caixa: `{ c:[x,y,z], s:[largura,largura,altura], role:'cor' }`
- `x` = frente, `y` = direita, `z` = para cima (mesma unidade do mundo; o carro tem 46 de comprimento).
- `role` aponta para uma cor em `roles()`.

## Arte ASCII à mão (itens e minas)
São listas de strings, uma por linha. No `pad`, o `@` vira a letra do item.

## Dicas
- Teclas `+` / `-` no jogo mudam a densidade do ASCII.
- `ZOOM` e `FS_BASE` (topo de `js/game.js`) controlam distância da câmera e tamanho da fonte.

## Carros pré-gerados (sprites/baked/)
Converter o carro 3D em ASCII em tempo real é caro, então os carros são gerados **antes** e o jogo só copia os PNGs.
Se `sprites/baked/` não existir, o jogo gera os carros em tempo real (mais lento, mas igual).

Para refazer depois de mexer em `car.js` (formato, cores) ou nos parâmetros do bake:
1. Na pasta do jogo: `python3 -m http.server 8123` (jogo) e, em outro terminal, `python3 tools/save_server.py` (grava os arquivos).
2. Abra `http://127.0.0.1:8123/tools/bake.html`. Quando aparecer **PRONTO** (~10 s), os arquivos estão em `sprites/baked/`.
3. Recarregue o jogo.

Parâmetros no topo de `tools/bake.html`: nº de ângulos (`angles`, padrão 48), tamanho do caractere (`sfs`),
resolução (`dpr`, padrão 2 = nítido em telas 2x e reduzido nas outras) e as cores (`colors`, as mesmas de `CAR_DEFS` em `js/game.js`).
Se mudar `ZOOM_CSS` ou `CAR_SPRITE.scale`, o jogo reduz/amplia o sprite automaticamente; para ficar 100% nítido, refaça o bake com o mesmo `zoomCss`.
