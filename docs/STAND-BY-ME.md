# Stand By Me no DrumKiller

Estudo jogável da **segunda parte**, versão Dino Fonseca (Acoustic Sessions).
São 25 compassos em 4/4 a 122 BPM e 318 notas. O acompanhamento é um clique
sintetizado, com dois compassos de preparação. Não contém a gravação da música.

## Abrir a versão local

```sh
npm ci
npm run dev:study
```

Abra <http://127.0.0.1:5175/#songs-practice>. A música já aparece na biblioteca.
A tela abre sem iniciar a reprodução. Selecionar um cartão inicia a prévia
de áudio do jogo; para tocar, escolha a dificuldade e pressione **PRACTICE**.

Use **EXPERT** para tocar exatamente as notas aprovadas. O jogo cria as outras
dificuldades automaticamente e pode retirar notas, subdivisões e partes das viradas.
No modo Practice é possível reduzir a velocidade e ativar **GUIDE DRUMS**.
O clique conta dois compassos completos antes da primeira nota do estudo,
além da contagem visual de entrada já existente no jogo.

## Importar o pacote em outra instalação

```sh
npm run study:stand-by-me
```

O comando gera:

- `local/stand-by-me-segunda-parte-study.zip`, pronto para **IMPORT ZIP**.
- `public/songs/stand-by-me-segunda-parte-study/`, pronto para **IMPORT FOLDER**.
- `study.json`, dentro do pacote, com ordem, contagens e limites do estudo.

Esses arquivos são locais e ignorados pelo Git. `predev` e `prebuild` regeneram
a versão com clique para que o catálogo funcione também em um clone novo.
O script usa o escritor MIDI, o encoder WAV e o formato de pacote do DrumKiller.
Não depende do checkout do Groove e não acessa áudio, MIDI ou apps do computador.
Para uma saída separada: `node scripts/make-groove-song.mjs studies/stand-by-me-segunda-parte.json local/minha-copia`.
Nesse caso o ZIP fica ao lado da pasta escolhida. O gerador recusa sobrescrever
pastas existentes sem seu marcador de geração.

## Aroma TDX-DRUM

No Chrome, ao iniciar o treino, permita acesso MIDI e confira **TDX-DRUM** no
**PAD SETUP**. O preset **General MIDI drums** já cobre bumbo 36, caixa 38,
chimbal fechado 42, aberto 46 e ride 51. Se algum pad não corresponder,
use o assistente de mapeamento por dispositivo do próprio jogo.

A compatibilidade do preset foi verificada no código. Recepção física da Aroma,
chimbal aberto e sensação de latência ainda precisam de teste tocando.
Nenhuma calibração, configuração de áudio ou outro aplicativo foi alterado.

## Estrutura preservada

| Compassos | Seção | Repetições |
| --- | --- | --- |
| 1 | Base | 1 |
| 2 | Acompanha o baixo | 1 |
| 3 a 7 | Base | 5 |
| 8 | Virada na caixa | 1 |
| 9 | Base | 1 |
| 10 | Acompanha o baixo | 1 |
| 11 a 14 | Base | 4 |
| 15 | Chimbal aberto | 1 |
| 16 | Virada com chimbal aberto | 1 |
| 17 a 24 | Ride simples | 8 |
| 25 | Virada com ride | 1 |

A Base tem bumbo no 1 e na segunda colcheia do 2, sem bumbo no 3. A seção
que acompanha o baixo acrescenta o bumbo no 3. A virada final vem depois
dos oito compassos de ride simples. Intro, entrada inicial e coda não fazem
parte deste pacote.

## Gravação e coda pendentes

O arquivo local de referência foi medido com ffprobe: 119,262292 segundos,
estéreo, 48 kHz. Não foi reproduzido nem incluído no repositório ou no ZIP.
O trecho de 25 compassos dura 49,180328 segundos. Seu `offset` de 3,934426
segundos pertence exclusivamente aos dois compassos de clique gerado.
Não é um offset confirmado da gravação.

A primeira parte corrigida teria 29 compassos, a segunda 25 e a coda relatada
mais 9. Isso resulta em 63 compassos ou 123,934426 segundos a 122 BPM,
aproximadamente 4,67 segundos além da duração da gravação. A contagem sozinha
não estabelece o primeiro tempo nem autoriza cortar áudio ou mudar notas.

A análise anterior do áudio contém candidatos de mudança de energia, mas
não confirma os limites musicais. Para usar a gravação real, ainda será
necessário confirmar a entrada da segunda parte e sua duração, e conferir
a instrumentação da coda relatada como chimbal aberto oito vezes e sua
virada uma vez. O Studio permite substituir áudio e ajustar offset quando
esses pontos estiverem confirmados. Use uma cópia local do pacote para isso.

## Fontes e licença

O fixture em `studies/stand-by-me-segunda-parte.json` transcreve somente os
dados do estudo aprovado em 07/11/2026, registrados em
`one-man-band/docs/estudos/stand-by-me-segunda-parte.json` e no diário
`estudo-por-secoes.md`. Não contém contas, caminhos pessoais ou gravações.
O conversor aceita o modelo de grade reto em 4/4, expande as repetições e
atribui intensidade neutra de 0,8 às notas. Swing e articulações além de
normal e chimbal aberto são recusados explicitamente. Não copia o motor
ou o gerador MIDI do Groove.

O DrumKiller mantém sua autoria e licença MIT originais, conforme `LICENSE`.
Upstream: <https://github.com/sam1am/drumkiller>.
Fork: <https://github.com/fguisso/drumkiller>.

## Verificação

```sh
npm test
npm run typecheck
npm run build
```

O teste de integração gera um ZIP real, importa pelo carregador do jogo e
compara todas as notas com as posições aprovadas, incluindo as repetições,
o canal MIDI 10, o andamento, o clique e o tempo de preparação.

Com a prévia local aberta, `npm run e2e:study` percorre os 25 compassos com
teclado automatizado em um Chrome headless separado, mudo e sem acesso MIDI.
O resultado e a captura do highway ficam em `.e2e/`, fora do Git.
`CHROME` permite indicar outro executável do Chrome. Este teste não valida
áudio físico ou latência da bateria real.
