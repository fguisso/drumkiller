# Stand By Me completa, pelo MIDI

63 compassos em 4/4 a 122 BPM, com 757 notas: primeira parte de 29,
segunda parte de 25 e final com chimbal aberto oito vezes mais a virada
aberta uma vez. As partes individuais aprovadas permanecem separadas.

```sh
npm ci
npm run dev:full
```

Abra <http://127.0.0.1:5176/?song=stand-by-me-completa-midi&difficulty=expert#songs-practice>.
A página fica parada, com a música e Expert selecionados.

- **OUVIR GUIA**: o ChartPlayer nativo toca o MIDI pelo DrumKit interno.
  O retorno das batidas fica desligado nessa execução.
- **TOCAR**: o kit responde às suas batidas MIDI, respeitando a preferência
  de som dos pads já salva em Settings. O guia começa desligado.
- Durante Practice, **GUIA MIDI** e **MINHAS BATIDAS** podem ser ligados
  separadamente, inclusive juntos quando desejado, sem mudar a preferência
  global de quem usa um instrumento externo.
- Settings mantém os volumes nativos de Song e Drum. O volume Drum controla
  o kit; Song controla somente os dois compassos de clique de preparação.

O pacote usa somente MIDI, o kit nativo e clique de preparação. Não há
fonograma, stems, acompanhamento harmônico ou dependência do GarageBand.
Depois da preparação, o áudio de suporte fica silencioso: o som do guia
vem do mesmo chart que desenha as notas, sem bateria duplicada no arquivo.

`npm run study:full` gera `local/stand-by-me-completa-midi.zip`, importável
pelo jogo. O final segue a instrução explícita de chimbal aberto, sem
alterar a Wiki. Expert preserva todas as notas; níveis menores simplificam.
