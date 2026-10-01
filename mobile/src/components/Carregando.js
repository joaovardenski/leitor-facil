import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, AccessibilityInfo, StyleSheet } from 'react-native';

const ALTURA_PAGINA = 170;

/**
 * Tela de espera enquanto o servidor lê a foto: uma página desenhada com uma
 * faixa "escaneando" de cima para baixo. É a única animação do app, e fica
 * parada se o celular estiver com "Reduzir movimento" ligado.
 */
export default function Carregando({ tema }) {
  const posicao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animacao;
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduzir) => {
      if (!ativo || reduzir) return;
      animacao = Animated.loop(
        Animated.sequence([
          Animated.timing(posicao, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(posicao, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      animacao.start();
    });
    return () => {
      ativo = false;
      animacao?.stop();
    };
  }, [posicao]);

  const desloca = posicao.interpolate({ inputRange: [0, 1], outputRange: [8, ALTURA_PAGINA - 20] });

  return (
    <View style={estilos.centro} accessibilityLiveRegion="polite">
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[estilos.pagina, { borderColor: tema.borda, backgroundColor: tema.superficie }]}
      >
        {[0.8, 0.95, 0.7, 0.9, 0.85, 0.6, 0.9, 0.75].map((largura, i) => (
          <View key={i} style={[estilos.linhaTexto, { width: `${largura * 100}%`, backgroundColor: tema.textoSuave }]} />
        ))}
        <Animated.View
          style={[estilos.faixa, { backgroundColor: tema.texto, transform: [{ translateY: desloca }] }]}
        />
      </View>

      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Lendo o papel…
      </Text>
      <Text style={[estilos.subtitulo, { color: tema.textoSuave }]}>Isso leva alguns segundos.</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pagina: {
    width: 130,
    height: ALTURA_PAGINA,
    borderWidth: 3,
    borderRadius: 10,
    padding: 16,
    paddingTop: 20,
    gap: 10,
    overflow: 'hidden',
    marginBottom: 32,
  },
  linhaTexto: { height: 6, borderRadius: 3, opacity: 0.55 },
  faixa: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, borderRadius: 3 },
  titulo: { fontSize: 34, fontWeight: 'bold', textAlign: 'center' },
  subtitulo: { fontSize: 22, textAlign: 'center', marginTop: 8 },
});
