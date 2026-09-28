# Roteiro do vídeo (até 5 minutos)

Segue a estrutura sugerida na atividade. As falas são um ponto de partida: adaptem ao jeito de vocês e troquem os exemplos pelos que apareceram no co-design.

**Antes de gravar**

- Servidor rodando e app aberto no Expo Go, com o celular espelhado no computador (ex.: `scrcpy` no Android, ou gravação de tela do próprio celular).
- Separar 3 papéis de verdade: uma bula ou caixa de remédio, uma conta de luz e um papel amassado ou mal iluminado (para mostrar o aviso).
- Tema amarelo no preto ligado, histórico com 2 ou 3 leituras.
- Ter em mãos as anotações de `docs/co-design.md` (nomes fictícios dos participantes, o que mudou por causa deles).

---

## 0:00 – 1:00 · Contexto e empatia

**Mostrar:** foto ou vídeo de uma bula em letra pequena; se tiverem autorização, um trecho curto da entrevista com um participante (ou só a fala dele em texto na tela).

**Falar:**

- Quem é o usuário: pessoas idosas e com baixa visão (catarata, glaucoma, degeneração macular, retinopatia diabética). Apresentar o perfil funcional de P1 (ex.: "72 anos, catarata, mora sozinha, usa celular para WhatsApp").
- O problema: documentos importantes (bula, receita, conta) vêm em letra pequena; a pessoa depende de alguém para ler, perde autonomia e corre risco de errar a dose de um remédio.
- Justificativa teórica: Tecnologia Assistiva como recurso que amplia a autonomia e a participação da pessoa com deficiência (conceito do Comitê de Ajudas Técnicas e da Lei Brasileira de Inclusão, Lei 13.146/2015). **Citar aqui os referenciais de TA vistos na unidade.**
- Dado de impacto (opcional): a OMS estima que pelo menos 2,2 bilhões de pessoas no mundo têm algum problema de visão (Relatório Mundial sobre a Visão, 2019).

## 1:00 – 2:30 · Arquitetura e desenvolvimento

**Mostrar:** o diagrama de arquitetura do README e, rapidamente, a estrutura de pastas no editor.

**Falar:**

- Fluxo: o app tira a foto → envia ao servidor → o servidor melhora a imagem (gira, tira a cor, aumenta o contraste) → o Tesseract reconhece o texto em português → o app mostra em letra grande e lê em voz alta.
- Stack: React Native com Expo (um só código para Android e iPhone), Node.js com Express, Sharp e Tesseract.js, SQLite no celular.
- **Como as escolhas reduziram o custo:**
  - tudo gratuito e de código aberto, sem pagar APIs de OCR ou de voz (a voz é a do próprio celular);
  - funciona em qualquer celular comum, sem comprar lupa eletrônica ou leitor dedicado;
  - o modelo de português vem no próprio pacote, o servidor roda até num computador simples.
- Privacidade: a foto não é salva em lugar nenhum; o histórico fica só no celular (LGPD).
- Qualidade: mostrar o `npm test` passando (11 testes, incluindo foto deitada e foto escura).

## 2:30 – 4:00 · Demonstração prática

**Mostrar (screencast do celular):**

1. **Bula:** tocar em "Tirar foto", fotografar a bula. Mostrar a tela "Lendo o papel..." (e que ela também é falada) e o resultado sendo lido **automaticamente**.
2. **Ajustes:** tocar em "Letra maior" duas vezes e em "Voz devagar". Destacar que as preferências ficam salvas.
3. **Foto ruim:** fotografar o papel amassado/escuro e mostrar o **aviso falado e escrito** pedindo outra foto.
4. **Conta de luz:** achar o valor e o vencimento.
5. **Histórico:** abrir "Leituras anteriores", reabrir uma leitura e apagar outra.
6. **Cores:** trocar para preto no branco.
7. **Leitor de tela:** ligar o TalkBack (ou VoiceOver) e navegar pelos botões, mostrando que todos são anunciados com nome e dica.

**Falar enquanto mostra:** as decisões de acessibilidade da tabela do README (botões de 88 dp, poucos botões com texto, contraste AAA, leitura automática, avisos falados).

## 4:00 – 5:00 · Acompanhamento e próximos passos

**Falar:**

- **Resultados do teste com usuários** (tabela da Sessão 3 do co-design): quantas tarefas cada participante fez sozinho, tempo, comentários.
- **O que mudou por causa dos participantes** (ex.: "P1 não achava o botão ouvir, então a leitura virou automática").
- **Plano de acompanhamento:** nova rodada de testes depois de algumas semanas de uso; canal para relatar problemas (Issues do GitHub ou contato do grupo); revisar as preferências mais usadas.
- **Próximos passos:**
  - OCR direto no celular, para funcionar sem internet;
  - destacar automaticamente dose, valor e datas;
  - modo de câmera guiada ("aproxime mais", "falta luz");
  - publicar o servidor na nuvem para ninguém precisar rodar em casa.
- **Limitações honestas:** o OCR erra com fotos ruins e não lê letra de médico; o app **não substitui** a orientação de farmacêutico ou médico.
- **Impacto social:** mais autonomia no dia a dia, menos dependência de terceiros, menos risco de erro com remédios, a custo zero para quem usa.
