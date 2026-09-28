import { View, Text, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';

export default function InicioScreen({
  tema,
  carregando,
  erro,
  servidorOk,
  aoTirarFoto,
  aoEscolherGaleria,
  aoAbrirHistorico,
  aoTrocarTema,
  aoTentarServidor,
}) {
  if (carregando) {
    return (
      <View style={estilos.centro} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={tema.texto} />
        <Text style={[estilos.titulo, { color: tema.texto, marginTop: 24 }]}>Lendo o papel...</Text>
        <Text style={[estilos.subtitulo, { color: tema.texto }]}>Isso pode levar alguns segundos.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Leitor Fácil
      </Text>
      <Text style={[estilos.subtitulo, { color: tema.texto }]}>
        Fotografe um papel para ver em letra grande e ouvir.
      </Text>

      {servidorOk === false ? (
        <View style={[estilos.caixa, { borderColor: tema.borda }]} accessibilityLiveRegion="polite">
          <Text style={[estilos.textoCaixa, { color: tema.texto }]}>
            O serviço de leitura não está respondendo. Verifique a internet.
          </Text>
          <BotaoGrande tema={tema} secundario rotulo="Tentar de novo" dica="Verifica a conexão outra vez" aoTocar={aoTentarServidor} />
        </View>
      ) : null}

      {erro ? (
        <Text accessibilityLiveRegion="assertive" style={[estilos.caixa, estilos.textoCaixa, estilos.caixaErro, { color: tema.texto, borderColor: tema.borda }]}>
          ⚠ {erro}
        </Text>
      ) : null}

      <BotaoGrande tema={tema} rotulo="Tirar foto" dica="Abre a câmera para fotografar o papel" aoTocar={aoTirarFoto} />
      <BotaoGrande tema={tema} rotulo="Escolher da galeria" dica="Abre suas fotos salvas" aoTocar={aoEscolherGaleria} />
      <BotaoGrande tema={tema} secundario rotulo="Leituras anteriores" dica="Mostra os últimos papéis lidos" aoTocar={aoAbrirHistorico} />
      <BotaoGrande tema={tema} secundario rotulo={`Cores: ${tema.nome}`} dica="Troca as cores da tela" aoTocar={aoTrocarTema} />

      <Text style={[estilos.dica, { color: tema.texto }]}>
        Dica: deixe o papel reto, em um lugar bem iluminado, e segure o celular firme.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flexGrow: 1, padding: TAMANHOS.espaco * 1.5, justifyContent: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: TAMANHOS.espaco },
  titulo: { fontSize: TAMANHOS.fonteTitulo + 6, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontSize: 22, textAlign: 'center', marginBottom: 32 },
  caixa: { borderWidth: 3, borderRadius: 12, padding: 16, paddingBottom: 0, marginBottom: 24 },
  textoCaixa: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  caixaErro: { paddingBottom: 16, marginBottom: 24 },
  dica: { fontSize: 20, textAlign: 'center', marginTop: 8 },
});
