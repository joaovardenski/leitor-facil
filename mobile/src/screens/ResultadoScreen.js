import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, AccessibilityInfo } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';
import { falar, pararFala, VELOCIDADE_MIN, VELOCIDADE_MAX } from '../fala';

const PASSO_FONTE = 4;
const PASSO_VELOCIDADE = 0.1;

export default function ResultadoScreen({ tema, leitura, prefs, aoMudarPreferencia, aoVoltar }) {
  const { texto, aviso } = leitura;
  const { tamanhoFonte, velocidade } = prefs;
  const [falando, setFalando] = useState(false);

  // O aviso (foto ruim) é falado antes do texto, para quem não enxerga a faixa na tela.
  const falaCompleta = [aviso, texto].filter(Boolean).join('. ');

  function ouvir(vel = velocidade) {
    if (!falaCompleta) return;
    setFalando(true);
    falar(falaCompleta, vel, { aoTerminar: () => setFalando(false) });
  }

  function parar() {
    pararFala();
    setFalando(false);
  }

  // Leitura automática ao abrir: a pessoa não precisa procurar o botão "ouvir".
  useEffect(() => {
    ouvir();
    return () => pararFala();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function mudarFonte(delta) {
    const novo = Math.min(TAMANHOS.fonteMax, Math.max(TAMANHOS.fonteMin, tamanhoFonte + delta));
    if (novo === tamanhoFonte) {
      AccessibilityInfo.announceForAccessibility(delta > 0 ? 'A letra já está no máximo' : 'A letra já está no mínimo');
      return;
    }
    aoMudarPreferencia('tamanhoFonte', novo);
  }

  function mudarVelocidade(delta) {
    const nova = Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, +(velocidade + delta).toFixed(1)));
    aoMudarPreferencia('velocidade', nova);
    // Se estava falando, recomeça na nova velocidade para a pessoa perceber a diferença
    if (falando) ouvir(nova);
    else AccessibilityInfo.announceForAccessibility(`Velocidade da voz: ${formatarVelocidade(nova)}`);
  }

  return (
    <View style={estilos.container}>
      {aviso ? (
        <Text accessibilityLiveRegion="assertive" style={[estilos.aviso, { color: tema.texto, borderColor: tema.borda }]}>
          ⚠ {aviso}
        </Text>
      ) : null}

      <ScrollView style={estilos.areaTexto} contentContainerStyle={estilos.conteudoTexto}>
        <Text selectable style={{ color: tema.texto, fontSize: tamanhoFonte, lineHeight: tamanhoFonte * 1.4 }}>
          {texto || 'Nenhum texto encontrado.'}
        </Text>
      </ScrollView>

      <Text style={[estilos.status, { color: tema.texto, borderTopColor: tema.borda }]} maxFontSizeMultiplier={1.3}>
        Letra {tamanhoFonte} · Voz {formatarVelocidade(velocidade)}
      </Text>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          {falando ? (
            <BotaoGrande tema={tema} rotulo="Parar voz" dica="Para a leitura em voz alta" aoTocar={parar} />
          ) : (
            <BotaoGrande tema={tema} rotulo="Ouvir" dica="Lê o texto em voz alta" aoTocar={() => ouvir()} desativado={!falaCompleta} />
          )}
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} rotulo="Voltar" dica="Volta para a tela inicial" aoTocar={aoVoltar} />
        </View>
      </View>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Letra menor" dica="Diminui o tamanho do texto" aoTocar={() => mudarFonte(-PASSO_FONTE)} />
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Letra maior" dica="Aumenta o tamanho do texto" aoTocar={() => mudarFonte(PASSO_FONTE)} />
        </View>
      </View>

      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Voz devagar" dica="Diminui a velocidade da voz" aoTocar={() => mudarVelocidade(-PASSO_VELOCIDADE)} />
        </View>
        <View style={estilos.metade}>
          <BotaoGrande tema={tema} secundario rotulo="Voz rápida" dica="Aumenta a velocidade da voz" aoTocar={() => mudarVelocidade(PASSO_VELOCIDADE)} />
        </View>
      </View>
    </View>
  );
}

function formatarVelocidade(v) {
  return `${v.toFixed(1).replace('.', ',')}x`;
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco, paddingBottom: 0 },
  aviso: { fontSize: 22, fontWeight: 'bold', borderWidth: 3, borderRadius: 12, padding: 12, marginBottom: 12 },
  areaTexto: { flex: 1 },
  conteudoTexto: { paddingBottom: TAMANHOS.espaco },
  status: { fontSize: 18, textAlign: 'center', borderTopWidth: 2, paddingTop: 8, marginBottom: 8 },
  linha: { flexDirection: 'row', gap: TAMANHOS.espaco },
  metade: { flex: 1 },
});
