import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, BackHandler, AccessibilityInfo } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import InicioScreen from './src/screens/InicioScreen';
import ResultadoScreen from './src/screens/ResultadoScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import { TEMAS } from './src/theme';
import { lerFoto, verificarServidor } from './src/api';
import { falar } from './src/fala';
import { iniciarBanco, carregarPreferencias, salvarPreferencia, salvarLeitura, PREFERENCIAS_PADRAO } from './src/db';

// Controle simples de telas, sem biblioteca de navegação: 'inicio' | 'resultado' | 'historico'
export default function App() {
  const [tela, setTela] = useState('inicio');
  const [prefs, setPrefs] = useState(PREFERENCIAS_PADRAO);
  const [leitura, setLeitura] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [servidorOk, setServidorOk] = useState(null); // null = ainda verificando

  const checarServidor = useCallback(async () => {
    setServidorOk(await verificarServidor());
  }, []);

  useEffect(() => {
    iniciarBanco();
    setPrefs(carregarPreferencias());
    checarServidor();
  }, [checarServidor]);

  // Botão "voltar" do Android: volta para o início em vez de fechar o app
  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tela !== 'inicio') {
        setTela('inicio');
        return true;
      }
      return false;
    });
    return () => assinatura.remove();
  }, [tela]);

  const tema = TEMAS[prefs.tema] || TEMAS.amareloNoPreto;

  function mudarPreferencia(chave, valor) {
    salvarPreferencia(chave, valor);
    setPrefs((p) => ({ ...p, [chave]: valor }));
  }

  function mostrarErro(mensagem) {
    setErro(mensagem);
    falar(mensagem, prefs.velocidade); // aviso falado, não só escrito
  }

  // Fluxo principal: foto → servidor (OCR) → tela de resultado
  async function obterFoto(origem) {
    setErro(null);
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      mostrarErro(
        origem === 'camera'
          ? 'Preciso da sua permissão para usar a câmera. Você pode liberar nas configurações do celular.'
          : 'Preciso da sua permissão para ver suas fotos. Você pode liberar nas configurações do celular.'
      );
      return;
    }

    // base64: a foto vai para o servidor como texto (ver src/api.js)
    const opcoes = { mediaTypes: ['images'], quality: 0.7, base64: true };
    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled || !resultado.assets?.length) return;

    setCarregando(true);
    falar('Lendo o papel. Aguarde.', prefs.velocidade);
    try {
      const dados = await lerFoto(resultado.assets[0]);
      if (dados.texto) salvarLeitura(dados.texto);
      setServidorOk(true);
      setLeitura(dados);
      setTela('resultado');
    } catch (e) {
      mostrarErro(e.message);
      checarServidor();
    } finally {
      setCarregando(false);
    }
  }

  function trocarTema() {
    const nomes = Object.keys(TEMAS);
    const proximo = nomes[(nomes.indexOf(prefs.tema) + 1) % nomes.length];
    mudarPreferencia('tema', proximo);
    AccessibilityInfo.announceForAccessibility(`Cores: ${TEMAS[proximo].nome}`);
  }

  let conteudo;
  if (tela === 'resultado' && leitura) {
    conteudo = (
      <ResultadoScreen
        tema={tema}
        leitura={leitura}
        prefs={prefs}
        aoMudarPreferencia={mudarPreferencia}
        aoVoltar={() => setTela('inicio')}
      />
    );
  } else if (tela === 'historico') {
    conteudo = (
      <HistoricoScreen
        tema={tema}
        aoAbrirLeitura={(item) => {
          setLeitura({ texto: item.texto, aviso: null });
          setTela('resultado');
        }}
        aoVoltar={() => setTela('inicio')}
      />
    );
  } else {
    conteudo = (
      <InicioScreen
        tema={tema}
        carregando={carregando}
        erro={erro}
        servidorOk={servidorOk}
        aoTirarFoto={() => obterFoto('camera')}
        aoEscolherGaleria={() => obterFoto('galeria')}
        aoAbrirHistorico={() => {
          setErro(null);
          setTela('historico');
        }}
        aoTrocarTema={trocarTema}
        aoTentarServidor={checarServidor}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[estilos.app, { backgroundColor: tema.fundo }]}>
        <StatusBar style={tema.fundo === '#000000' ? 'light' : 'dark'} />
        {conteudo}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  app: { flex: 1 },
});
