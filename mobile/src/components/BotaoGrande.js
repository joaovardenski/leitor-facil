import { Pressable, View, Text, StyleSheet } from 'react-native';
import { TAMANHOS } from '../theme';
import Icone from './Icone';

/**
 * Botão padrão do app: grande, sempre com texto e acessível ao leitor de tela.
 * - rotulo: texto visível (também usado como accessibilityLabel)
 * - dica: explica o que acontece ao tocar (accessibilityHint)
 * - icone: nome de um ícone de Icone.js (opcional, só decoração)
 * - secundario: contorno em vez de cor cheia
 * - linha: ícone e texto alinhados à esquerda, como item de uma lista de opções
 * - detalhe: segunda linha menor, embaixo do rótulo (ex.: o tema atual)
 */
export default function BotaoGrande({
  rotulo,
  dica,
  aoTocar,
  tema,
  icone,
  secundario = false,
  linha = false,
  detalhe,
  desativado = false,
  estilo,
}) {
  const fundo = secundario ? tema.fundo : tema.botaoFundo;
  const cor = secundario ? tema.texto : tema.botaoTexto;

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={detalhe ? `${rotulo}: ${detalhe}` : rotulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: desativado }}
      style={({ pressed }) => [
        estilos.botao,
        linha ? estilos.botaoLinha : estilos.botaoCentro,
        {
          // Ao tocar, o botão "afunda" um pouco: confirma o toque para quem não enxerga bem
          backgroundColor: pressed && secundario ? tema.superficie : fundo,
          borderColor: tema.borda,
          opacity: desativado ? 0.5 : pressed && !secundario ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        estilo,
      ]}
    >
      {icone ? <Icone nome={icone} cor={cor} tamanho={linha ? 34 : 30} /> : null}
      {/* O rótulo já é grande: limitamos o quanto a fonte do sistema o aumenta
          para não estourar o botão. O texto lido (tela de resultado) não tem limite. */}
      <View style={estilos.textos}>
        <Text
          maxFontSizeMultiplier={1.4}
          style={[estilos.texto, linha ? estilos.textoLinha : estilos.textoCentro, { color: cor }]}
        >
          {rotulo}
        </Text>
        {detalhe ? (
          <Text maxFontSizeMultiplier={1.3} style={[estilos.detalhe, { color: secundario ? tema.textoSuave : cor }]}>
            {detalhe}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    borderWidth: TAMANHOS.borda,
    borderRadius: TAMANHOS.raio,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  botaoCentro: { minHeight: TAMANHOS.alturaBotao, justifyContent: 'center' },
  botaoLinha: { minHeight: TAMANHOS.alturaLinha, justifyContent: 'flex-start' },
  textos: { flexShrink: 1 },
  texto: { fontSize: TAMANHOS.fonteBotao, fontWeight: 'bold' },
  textoCentro: { textAlign: 'center' },
  textoLinha: { textAlign: 'left', fontSize: 23 },
  detalhe: { fontSize: 18, marginTop: 2 },
});
