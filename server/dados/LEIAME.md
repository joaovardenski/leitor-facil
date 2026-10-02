# Listas de palavras do corretor

Usadas por `src/corretor.js` para corrigir palavras que o Tesseract lê errado (ex.: "Atencao" → "Atenção", "c0mprimido" → "comprimido"). Ficam compactadas (`.gz`) e são carregadas uma vez, quando o servidor inicia.

| Arquivo | O que é | Fonte | Licença |
|---|---|---|---|
| `frequencia.txt.gz` | As 50 mil palavras mais usadas no português do Brasil, com o número de ocorrências. Usada para escolher a correção mais provável. | [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave), arquivo `content/2018/pt_br/pt_br_50k.txt`, gerado a partir de legendas do OpenSubtitles | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `dicionario.txt.gz` | Cerca de 312 mil palavras do dicionário ortográfico (só as formas base, sem as regras de flexão). Usada para saber se uma palavra rara existe e não mexer nela. | [VERO](https://pt-br.libreoffice.org/projetos/vero/), verificador ortográfico do LibreOffice, por Raimundo Moura e equipe, via o pacote [dictionary-pt](https://github.com/wooorm/dictionaries/tree/main/dictionaries/pt) | LGPL-3.0 ou MPL-2.0 (texto em `LICENCA-dicionario.txt`) |

| `termos-protegidos.txt` | Nomes de remédio, princípios ativos, nomes científicos em latim (fitoterápicos, probióticos) e excipientes. **Nunca são trocados** pelo corretor, e servem para consertar uma letra lida errada ("Glnkgo" → "Ginkgo", "arnoxicilina" → "amoxicilina"). | Lista do projeto: **podem e devem aumentar**, uma palavra por linha, e reiniciar o servidor | do projeto |

As listas compactadas foram só convertidas (uma palavra por linha) e compactadas, sem outras alterações. Elas seguem as licenças originais acima.

Por que listas e não um corretor ortográfico pronto? O `nspell`, o corretor mais usado em Node, levou mais de 5 minutos para carregar o dicionário de português, então não daria para usar no servidor. Com as listas, o corretor carrega em menos de meio segundo.
