import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';

export default function InicioScreen({ tema, carregando, erro, aoTirarFoto, aoEscolherGaleria, aoAbrirHistorico, aoTrocarTema }) {
  if (carregando) {
    return (
      <View style={estilos.centro} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={tema.texto} />
        <Text style={[estilos.titulo, { color: tema.texto, marginTop: 24 }]}>Lendo o papel...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Leitor Fácil
      </Text>
      <Text style={[estilos.subtitulo, { color: tema.texto }]}>
        Fotografe um papel para ver em letra grande e ouvir.
      </Text>

      {erro ? (
        <Text accessibilityLiveRegion="assertive" style={[estilos.erro, { color: tema.texto, borderColor: tema.borda }]}>
          {erro}
        </Text>
      ) : null}

      <BotaoGrande tema={tema} rotulo="Tirar foto" dica="Abre a câmera para fotografar o papel" aoTocar={aoTirarFoto} />
      <BotaoGrande tema={tema} rotulo="Escolher da galeria" dica="Abre suas fotos salvas" aoTocar={aoEscolherGaleria} />
      <BotaoGrande tema={tema} secundario rotulo="Leituras anteriores" dica="Mostra os últimos papéis lidos" aoTocar={aoAbrirHistorico} />
      <BotaoGrande tema={tema} secundario rotulo={`Cores: ${tema.nome}`} dica="Troca as cores da tela" aoTocar={aoTrocarTema} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco * 1.5, justifyContent: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: TAMANHOS.espaco },
  titulo: { fontSize: TAMANHOS.fonteTitulo + 6, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontSize: 22, textAlign: 'center', marginBottom: 32 },
  erro: { fontSize: 22, fontWeight: 'bold', borderWidth: 3, borderRadius: 12, padding: 16, marginBottom: 24 },
});
