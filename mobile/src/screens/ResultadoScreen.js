import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, AccessibilityInfo } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import Ajuste from '../components/Ajuste';
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
    AccessibilityInfo.announceForAccessibility(`Letra ${novo}`);
  }

  function mudarVelocidade(delta) {
    const nova = Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, +(velocidade + delta).toFixed(1)));
    if (nova === velocidade) {
      AccessibilityInfo.announceForAccessibility(delta > 0 ? 'A voz já está no máximo' : 'A voz já está no mínimo');
      return;
    }
    aoMudarPreferencia('velocidade', nova);
    // Se estava falando, recomeça na nova velocidade para a pessoa perceber a diferença
    if (falando) ouvir(nova);
    else AccessibilityInfo.announceForAccessibility(`Velocidade da voz: ${formatarVelocidade(nova)}`);
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.topo}>
        <BotaoGrande
          tema={tema}
          secundario
          icone="voltar"
          rotulo="Voltar"
          dica="Volta para a tela inicial"
          aoTocar={aoVoltar}
          estilo={estilos.voltar}
        />
      </View>

      {aviso ? (
        <View style={[estilos.aviso, { backgroundColor: tema.botaoFundo }]}>
          <Text accessibilityLiveRegion="assertive" style={[estilos.textoAviso, { color: tema.botaoTexto }]}>
            {aviso}
          </Text>
        </View>
      ) : null}

      {/* O texto lido, numa "folha" com fundo levemente diferente da tela */}
      <ScrollView
        style={[estilos.folha, { backgroundColor: tema.superficie }]}
        contentContainerStyle={estilos.conteudoFolha}
      >
        <Text selectable style={{ color: tema.texto, fontSize: tamanhoFonte, lineHeight: Math.round(tamanhoFonte * 1.45) }}>
          {texto || 'Nenhum texto encontrado. Volte e tente outra foto, mais de perto.'}
        </Text>
      </ScrollView>

      <View style={estilos.controles}>
        {falando ? (
          <BotaoGrande tema={tema} icone="parar" rotulo="Parar voz" dica="Para a leitura em voz alta" aoTocar={parar} />
        ) : (
          <BotaoGrande
            tema={tema}
            icone="som"
            rotulo="Ouvir"
            dica="Lê o texto em voz alta"
            aoTocar={() => ouvir()}
            desativado={!falaCompleta}
          />
        )}

        <Ajuste
          tema={tema}
          rotulo="Letra"
          valor={tamanhoFonte}
          valorFalado={`tamanho ${tamanhoFonte}`}
          menos={<Text maxFontSizeMultiplier={1} style={[estilos.aPequeno, { color: tema.botaoTexto }]}>A</Text>}
          mais={<Text maxFontSizeMultiplier={1} style={[estilos.aGrande, { color: tema.botaoTexto }]}>A</Text>}
          dicaMenos="Letra menor"
          dicaMais="Letra maior"
          aoDiminuir={() => mudarFonte(-PASSO_FONTE)}
          aoAumentar={() => mudarFonte(PASSO_FONTE)}
        />

        <Ajuste
          tema={tema}
          rotulo="Voz"
          rotuloFalado="Velocidade da voz"
          valor={formatarVelocidade(velocidade)}
          valorFalado={formatarVelocidade(velocidade)}
          menos="−"
          mais="+"
          dicaMenos="Voz mais devagar"
          dicaMais="Voz mais rápida"
          aoDiminuir={() => mudarVelocidade(-PASSO_VELOCIDADE)}
          aoAumentar={() => mudarVelocidade(PASSO_VELOCIDADE)}
        />
      </View>
    </View>
  );
}

function formatarVelocidade(v) {
  return `${v.toFixed(1).replace('.', ',')}x`;
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco, gap: 12 },
  topo: { flexDirection: 'row' },
  voltar: { minHeight: 64, paddingHorizontal: 18 },
  aviso: { borderRadius: TAMANHOS.raio, padding: 14 },
  textoAviso: { fontSize: 20, fontWeight: 'bold', lineHeight: 27 },
  folha: { flex: 1, borderRadius: TAMANHOS.raio },
  conteudoFolha: { padding: 20 },
  controles: { gap: 10 },
  aPequeno: { fontSize: 22, fontWeight: 'bold' },
  aGrande: { fontSize: 38, fontWeight: 'bold', lineHeight: 42 },
});
