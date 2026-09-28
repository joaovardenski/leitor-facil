import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';
import { falar, pararFala, VELOCIDADE_MIN, VELOCIDADE_MAX } from '../fala';

export default function ResultadoScreen({ tema, leitura, prefs, aoMudarPreferencia, aoVoltar }) {
  const { texto, aviso } = leitura;
  const { tamanhoFonte, velocidade } = prefs;

  // Leitura automática ao abrir: a pessoa não precisa procurar o botão "ouvir".
  useEffect(() => {
    const falaInicial = [aviso, texto].filter(Boolean).join('. ');
    if (falaInicial) falar(falaInicial, velocidade);
    return () => pararFala();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const mudarFonte = (delta) => {
    const novo = Math.min(TAMANHOS.fonteMax, Math.max(TAMANHOS.fonteMin, tamanhoFonte + delta));
    aoMudarPreferencia('tamanhoFonte', novo);
  };

  const mudarVelocidade = (delta) => {
    const nova = Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, +(velocidade + delta).toFixed(1)));
    aoMudarPreferencia('velocidade', nova);
    if (texto) falar(texto, nova);
  };

  return (
    <View style={estilos.container}>
      {aviso ? (
        <Text accessibilityLiveRegion="assertive" style={[estilos.aviso, { color: tema.texto, borderColor: tema.borda }]}>
          {aviso}
        </Text>
      ) : null}

      <ScrollView style={estilos.areaTexto} accessibilityLabel="Texto lido">
        <Text selectable style={{ color: tema.texto, fontSize: tamanhoFonte, lineHeight: tamanhoFonte * 1.4 }}>
          {texto || 'Nenhum texto encontrado.'}
        </Text>
      </ScrollView>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} rotulo="Ouvir" dica="Lê o texto em voz alta" aoTocar={() => falar(texto, velocidade)} desativado={!texto} />
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} rotulo="Parar" dica="Para a leitura em voz alta" aoTocar={pararFala} />
        </View>
      </View>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Letra menor" dica="Diminui o tamanho do texto" aoTocar={() => mudarFonte(-4)} />
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Letra maior" dica="Aumenta o tamanho do texto" aoTocar={() => mudarFonte(4)} />
        </View>
      </View>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Voz mais devagar" dica="Diminui a velocidade da voz" aoTocar={() => mudarVelocidade(-0.1)} />
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Voz mais rápida" dica="Aumenta a velocidade da voz" aoTocar={() => mudarVelocidade(0.1)} />
        </View>
      </View>

      <BotaoGrande tema={tema} rotulo="Voltar" dica="Volta para a tela inicial" aoTocar={aoVoltar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco },
  aviso: { fontSize: 22, fontWeight: 'bold', borderWidth: 3, borderRadius: 12, padding: 12, marginBottom: 12 },
  areaTexto: { flex: 1, marginBottom: TAMANHOS.espaco },
  linha: { flexDirection: 'row', gap: TAMANHOS.espaco },
  metade: { flex: 1 },
});
