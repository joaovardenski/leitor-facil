import { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, AccessibilityInfo } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';
import { listarLeituras, apagarLeitura } from '../db';

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function resumir(texto) {
  const primeiraLinha = texto.split('\n').find((l) => l.trim()) || '';
  return primeiraLinha.length > 60 ? primeiraLinha.slice(0, 60) + '…' : primeiraLinha;
}

export default function HistoricoScreen({ tema, aoAbrirLeitura, aoVoltar }) {
  const [leituras, setLeituras] = useState(() => listarLeituras());

  function confirmarApagar(item) {
    Alert.alert('Apagar leitura?', resumir(item.texto), [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, apagar',
        style: 'destructive',
        onPress: () => {
          apagarLeitura(item.id);
          setLeituras(listarLeituras());
          AccessibilityInfo.announceForAccessibility('Leitura apagada');
        },
      },
    ]);
  }

  function renderItem({ item }) {
    const resumo = resumir(item.texto);
    const data = formatarData(item.criado_em);
    return (
      <View style={[estilos.item, { backgroundColor: tema.superficie }]}>
        <Pressable
          onPress={() => aoAbrirLeitura(item)}
          accessibilityRole="button"
          accessibilityLabel={`${resumo}. Lido em ${data}`}
          accessibilityHint="Abre esta leitura e lê em voz alta"
          style={({ pressed }) => [estilos.itemAbrir, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[estilos.itemTitulo, { color: tema.texto }]} numberOfLines={2}>
            {resumo}
          </Text>
          <Text style={[estilos.itemData, { color: tema.textoSuave }]}>{data}</Text>
        </Pressable>
        <Pressable
          onPress={() => confirmarApagar(item)}
          accessibilityRole="button"
          accessibilityLabel={`Apagar leitura de ${data}`}
          style={({ pressed }) => [
            estilos.botaoApagar,
            { borderColor: tema.borda, backgroundColor: pressed ? tema.fundo : 'transparent' },
          ]}
        >
          <Text style={[estilos.textoApagar, { color: tema.texto }]} maxFontSizeMultiplier={1.3}>
            Apagar
          </Text>
        </Pressable>
      </View>
    );
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

      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Leituras anteriores
      </Text>

      {leituras.length === 0 ? (
        <View style={estilos.vazio}>
          <Text style={[estilos.vazioTitulo, { color: tema.texto }]}>Nenhuma leitura ainda.</Text>
          <Text style={[estilos.vazioTexto, { color: tema.textoSuave }]}>
            Os papéis que você fotografar aparecem aqui, para ouvir de novo quando quiser.
          </Text>
        </View>
      ) : (
        <FlatList
          data={leituras}
          keyExtractor={(l) => String(l.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco },
  topo: { flexDirection: 'row', marginBottom: 16 },
  voltar: { minHeight: 64, paddingHorizontal: 18 },
  titulo: { fontSize: TAMANHOS.fonteTitulo, fontWeight: 'bold', marginBottom: TAMANHOS.espaco },
  lista: { gap: 12, paddingBottom: TAMANHOS.espaco },
  vazio: { marginTop: 24, gap: 10 },
  vazioTitulo: { fontSize: 26, fontWeight: 'bold' },
  vazioTexto: { fontSize: 21, lineHeight: 29 },
  item: { borderRadius: TAMANHOS.raio, padding: 16, gap: 14 },
  itemAbrir: { minHeight: 64, justifyContent: 'center' },
  itemTitulo: { fontSize: 24, fontWeight: 'bold', lineHeight: 31 },
  itemData: { fontSize: 19, marginTop: 6 },
  botaoApagar: {
    alignSelf: 'flex-start',
    minHeight: 56,
    minWidth: 130,
    paddingHorizontal: 18,
    borderWidth: TAMANHOS.borda,
    borderRadius: TAMANHOS.raio - 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoApagar: { fontSize: 20, fontWeight: 'bold' },
});
