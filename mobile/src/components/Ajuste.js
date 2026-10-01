import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TAMANHOS } from '../theme';

/**
 * Seletor com o valor atual no meio: [ menos ]  Letra 32  [ mais ].
 * A pessoa vê o ajuste atual em vez de apertar botões "às cegas".
 *
 * No leitor de tela (VoiceOver/TalkBack) o meio funciona como um controle
 * ajustável: deslizar para cima/baixo aumenta ou diminui.
 */
export default function Ajuste({
  tema,
  rotulo,
  rotuloFalado,
  valor,
  valorFalado,
  menos,
  mais,
  dicaMenos,
  dicaMais,
  aoDiminuir,
  aoAumentar,
}) {
  return (
    <View style={[estilos.caixa, { borderColor: tema.borda }]}>
      <BotaoLado tema={tema} conteudo={menos} rotulo={dicaMenos} aoTocar={aoDiminuir} />

      <View
        style={estilos.meio}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={rotuloFalado || rotulo}
        accessibilityValue={{ text: valorFalado || String(valor) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') aoAumentar();
          if (e.nativeEvent.actionName === 'decrement') aoDiminuir();
        }}
      >
        <Text maxFontSizeMultiplier={1.2} style={[estilos.rotulo, { color: tema.textoSuave }]}>
          {rotulo}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={[estilos.valor, { color: tema.texto }]}>
          {valor}
        </Text>
      </View>

      <BotaoLado tema={tema} conteudo={mais} rotulo={dicaMais} aoTocar={aoAumentar} />
    </View>
  );
}

function BotaoLado({ tema, conteudo, rotulo, aoTocar }) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [
        estilos.lado,
        { backgroundColor: tema.botaoFundo, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      {typeof conteudo === 'string' ? (
        <Text maxFontSizeMultiplier={1.2} style={[estilos.simbolo, { color: tema.botaoTexto }]}>
          {conteudo}
        </Text>
      ) : (
        conteudo
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: TAMANHOS.borda,
    borderRadius: TAMANHOS.raio,
    padding: 6,
    minHeight: TAMANHOS.alturaLinha,
  },
  lado: {
    width: 84,
    alignSelf: 'stretch',
    minHeight: TAMANHOS.alturaLinha - 12 - TAMANHOS.borda * 2,
    borderRadius: TAMANHOS.raio - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  rotulo: { fontSize: 18, fontWeight: '600' },
  valor: { fontSize: 28, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  simbolo: { fontSize: 36, fontWeight: 'bold', lineHeight: 40 },
});
