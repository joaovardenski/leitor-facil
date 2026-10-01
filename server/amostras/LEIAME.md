# Amostras para medir a taxa de acerto

Coloque aqui as fotos de teste e o texto correto de cada uma:

```
bula-dipirona.jpg     ← a foto, do jeito que o app tiraria
bula-dipirona.txt     ← o texto que está na foto, digitado à mão
```

Depois, na pasta `server`, rode:

```bash
npm run medir
```

O resultado aparece no terminal e fica salvo em `resultado.md` (pronto para colar no relatório). O texto que cada motor leu fica em `lidos/`, para comparar onde ele errou.

Dicas:

- Varie as fotos: bula, conta de luz, página de livro, rótulo, com luz boa e luz ruim.
- No `.txt`, digite exatamente o que está escrito, com acentos. Maiúsculas e pontuação não contam na comparação.
- Só os arquivos `exemplo-*` e este LEIAME vão para o GitHub. As suas fotos ficam só no seu computador, porque podem ter dados pessoais.
