import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import BotaoGrande from '../components/BotaoGrande';
import Icone from '../components/Icone';
import { TAMANHOS } from '../theme';
import { falar, pararFala } from '../fala';
import { calcularQuadro, calcularRecorte } from '../recorte';

const INSTRUCAO = 'Coloque o texto dentro do quadro e aproxime o celular até o texto encher o quadro.';

/**
 * Câmera do próprio app, com uma moldura para enquadrar o texto.
 * O app envia a foto inteira e a posição da moldura; o servidor recorta
 * a foto nessa área antes de ler (fundo, mesa e página vizinha ficam de fora,
 * e o texto ocupa a imagem toda).
 */
export default function CameraScreen({ tema, prefs, aoFotografar, aoVoltar }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const camera = useRef(null);
  const [area, setArea] = useState(null);
  const [pronta, setPronta] = useState(false);
  const [tirando, setTirando] = useState(false);
  const [lanterna, setLanterna] = useState(false);

  const quadro = calcularQuadro(area);
  const liberada = permissao?.granted;

  // Instrução falada ao abrir: quem não enxerga bem a moldura também sabe o que fazer.
  // (Não paramos a voz ao fechar a tela: logo depois da foto o app fala "Lendo o papel".)
  useEffect(() => {
    if (liberada) falar(INSTRUCAO, prefs.velocidade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liberada]);

  function voltar() {
    pararFala();
    aoVoltar();
  }

  async function fotografar() {
    if (!camera.current || !pronta || tirando) return;
    setTirando(true);
    pararFala();
    try {
      const foto = await camera.current.takePictureAsync({ quality: 0.7, base64: true });
      const recorte = calcularRecorte(foto.width, foto.height, area, quadro);
      aoFotografar({ ...foto, mimeType: 'image/jpeg' }, recorte);
    } catch (erro) {
      console.warn('Falha ao tirar a foto:', erro?.message || erro);
      setTirando(false);
      falar('Não consegui tirar a foto. Tente de novo.', prefs.velocidade);
      AccessibilityInfo.announceForAccessibility('Não consegui tirar a foto. Tente de novo.');
    }
  }

  // Ainda verificando a permissão
  if (!permissao) return <View style={[estilos.tela, { backgroundColor: tema.fundo }]} />;

  if (!liberada) {
    return (
      <View style={[estilos.tela, estilos.pedido, { backgroundColor: tema.fundo }]}>
        <Text accessibilityRole="header" style={[estilos.tituloPedido, { color: tema.texto }]}>
          Preciso usar a câmera
        </Text>
        <Text style={[estilos.textoPedido, { color: tema.textoSuave }]}>
          {permissao.canAskAgain
            ? 'Para fotografar o papel, o app precisa da sua permissão para usar a câmera.'
            : 'A câmera está bloqueada para este app. Libere nos Ajustes do celular e volte aqui.'}
        </Text>
        {permissao.canAskAgain ? (
          <BotaoGrande tema={tema} rotulo="Permitir câmera" dica="Pede a permissão para usar a câmera" aoTocar={pedirPermissao} />
        ) : null}
        <BotaoGrande tema={tema} secundario icone="voltar" rotulo="Voltar" dica="Volta para a tela inicial" aoTocar={voltar} />
      </View>
    );
  }

  return (
    <View style={[estilos.tela, { backgroundColor: tema.fundo }]}>
      <View style={estilos.topo}>
        <BotaoGrande
          tema={tema}
          secundario
          icone="voltar"
          rotulo="Voltar"
          dica="Volta para a tela inicial"
          aoTocar={voltar}
          estilo={estilos.botaoTopo}
        />
        <BotaoGrande
          tema={tema}
          secundario
          rotulo={lanterna ? 'Apagar luz' : 'Acender luz'}
          dica="Liga ou desliga a lanterna do celular, para lugares escuros"
          aoTocar={() => setLanterna((l) => !l)}
          estilo={estilos.botaoTopo}
        />
      </View>

      <View style={estilos.areaCamera} onLayout={(e) => setArea(e.nativeEvent.layout)}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={lanterna}
          onCameraReady={() => setPronta(true)}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />

        {quadro ? <Moldura area={area} quadro={quadro} /> : null}

        <View style={estilos.instrucao} pointerEvents="none" accessible accessibilityLabel={INSTRUCAO}>
          <Text maxFontSizeMultiplier={1.3} style={estilos.instrucaoTitulo}>
            Coloque o texto dentro do quadro
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={estilos.instrucaoDica}>
            Aproxime até o texto encher o quadro
          </Text>
        </View>
      </View>

      <View style={estilos.base}>
        <Pressable
          onPress={fotografar}
          disabled={!pronta || tirando}
          accessibilityRole="button"
          accessibilityLabel={tirando ? 'Fotografando' : 'Tirar foto'}
          accessibilityHint="Fotografa o texto que está dentro do quadro"
          accessibilityState={{ disabled: !pronta || tirando }}
          style={({ pressed }) => [
            estilos.disparador,
            { borderColor: tema.borda, opacity: !pronta || tirando ? 0.5 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <View style={[estilos.miolo, { backgroundColor: tema.botaoFundo }]}>
            <Icone nome="camera" cor={tema.botaoTexto} tamanho={40} />
          </View>
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={[estilos.legenda, { color: tema.texto }]}>
          {tirando ? 'Fotografando…' : pronta ? 'Tirar foto' : 'Abrindo a câmera…'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Escurece tudo fora do quadro e desenha a borda dupla (preta por fora,
 * branca por dentro): aparece tanto sobre papel branco quanto sobre mesa escura.
 */
function Moldura({ area, quadro }) {
  const fora = 'rgba(0, 0, 0, 0.55)';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: quadro.y, backgroundColor: fora }} />
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: quadro.y + quadro.altura, bottom: 0, backgroundColor: fora }}
      />
      <View style={{ position: 'absolute', left: 0, width: quadro.x, top: quadro.y, height: quadro.altura, backgroundColor: fora }} />
      <View
        style={{
          position: 'absolute',
          left: quadro.x + quadro.largura,
          right: 0,
          top: quadro.y,
          height: quadro.altura,
          backgroundColor: fora,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: quadro.x - 4,
          top: quadro.y - 4,
          width: quadro.largura + 8,
          height: quadro.altura + 8,
          borderWidth: 3,
          borderColor: '#000000',
          borderRadius: 16,
        }}
      >
        <View style={{ flex: 1, borderWidth: 4, borderColor: '#FFFFFF', borderRadius: 12 }} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  pedido: { padding: TAMANHOS.espaco * 1.5, justifyContent: 'center', gap: 16 },
  tituloPedido: { fontSize: 32, fontWeight: 'bold' },
  textoPedido: { fontSize: 21, lineHeight: 29, marginBottom: 8 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 12 },
  botaoTopo: { minHeight: 64, paddingHorizontal: 16, flexShrink: 1 },
  areaCamera: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  instrucao: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  instrucaoTitulo: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  instrucaoDica: { color: '#FFFFFF', fontSize: 18, textAlign: 'center', marginTop: 2 },
  base: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  disparador: { width: 108, height: 108, borderRadius: 54, borderWidth: 5, padding: 6 },
  miolo: { flex: 1, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  legenda: { fontSize: 22, fontWeight: 'bold' },
});
