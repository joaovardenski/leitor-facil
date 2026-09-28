import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import InicioScreen from './src/screens/InicioScreen';
import ResultadoScreen from './src/screens/ResultadoScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import { TEMAS } from './src/theme';
import { lerFoto } from './src/api';
import { falar } from './src/fala';
import { iniciarBanco, carregarPreferencias, salvarPreferencia, salvarLeitura, PREFERENCIAS_PADRAO } from './src/db';

// Controle simples de telas, sem biblioteca de navegação: 'inicio' | 'resultado' | 'historico'
export default function App() {
  const [tela, setTela] = useState('inicio');
  const [prefs, setPrefs] = useState(PREFERENCIAS_PADRAO);
  const [leitura, setLeitura] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    iniciarBanco();
    setPrefs(carregarPreferencias());
  }, []);

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
      mostrarErro('Preciso da sua permissão para usar a câmera ou as fotos.');
      return;
    }

    const opcoes = { mediaTypes: ['images'], quality: 0.8 };
    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled) return;

    setCarregando(true);
    try {
      const dados = await lerFoto(resultado.assets[0].uri);
      if (dados.texto) salvarLeitura(dados.texto);
      setLeitura(dados);
      setTela('resultado');
    } catch (e) {
      mostrarErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  function trocarTema() {
    const nomes = Object.keys(TEMAS);
    const proximo = nomes[(nomes.indexOf(prefs.tema) + 1) % nomes.length];
    mudarPreferencia('tema', proximo);
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
        aoTirarFoto={() => obterFoto('camera')}
        aoEscolherGaleria={() => obterFoto('galeria')}
        aoAbrirHistorico={() => setTela('historico')}
        aoTrocarTema={trocarTema}
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
