import { Pressable, Text, StyleSheet } from 'react-native';
import { TAMANHOS } from '../theme';

/**
 * Botão padrão do app: grande, sempre com texto e acessível ao leitor de tela.
 * - rotulo: texto visível (também usado como accessibilityLabel)
 * - dica: explica o que acontece ao tocar (accessibilityHint)
 */
export default function BotaoGrande({ rotulo, dica, aoTocar, tema, secundario = false, desativado = false }) {
  const fundo = secundario ? tema.fundo : tema.botaoFundo;
  const cor = secundario ? tema.texto : tema.botaoTexto;

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: desativado }}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderColor: tema.borda, opacity: desativado ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      {/* O rótulo já é grande: limitamos o quanto a fonte do sistema o aumenta
          para não estourar o botão. O texto lido (tela de resultado) não tem limite. */}
      <Text maxFontSizeMultiplier={1.4} style={[estilos.texto, { color: cor }]}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    minHeight: TAMANHOS.alturaBotao,
    borderWidth: 4,
    borderRadius: 16,
    paddingHorizontal: TAMANHOS.espaco,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TAMANHOS.espaco,
  },
  texto: {
    fontSize: TAMANHOS.fonteBotao,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
