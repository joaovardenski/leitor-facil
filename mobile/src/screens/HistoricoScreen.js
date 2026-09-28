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
      <View style={[estilos.item, { borderColor: tema.borda }]}>
        <Pressable
          onPress={() => aoAbrirLeitura(item)}
          accessibilityRole="button"
          accessibilityLabel={`${resumo}. Lido em ${data}`}
          accessibilityHint="Abre esta leitura e lê em voz alta"
          style={estilos.itemAbrir}
        >
          <Text style={[estilos.itemTitulo, { color: tema.texto }]} numberOfLines={2}>
            {resumo}
          </Text>
          <Text style={[estilos.itemData, { color: tema.texto }]}>{data}</Text>
        </Pressable>
        <Pressable
          onPress={() => confirmarApagar(item)}
          accessibilityRole="button"
          accessibilityLabel={`Apagar leitura de ${data}`}
          style={[estilos.botaoApagar, { borderColor: tema.borda }]}
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
      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Leituras anteriores
      </Text>

      {leituras.length === 0 ? (
        <Text style={[estilos.vazio, { color: tema.texto }]}>Você ainda não leu nenhum papel.</Text>
      ) : (
        <FlatList data={leituras} keyExtractor={(l) => String(l.id)} renderItem={renderItem} style={estilos.lista} />
      )}

      <BotaoGrande tema={tema} rotulo="Voltar" dica="Volta para a tela inicial" aoTocar={aoVoltar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: TAMANHOS.espaco },
  titulo: { fontSize: TAMANHOS.fonteTitulo, fontWeight: 'bold', marginBottom: TAMANHOS.espaco },
  lista: { flex: 1, marginBottom: TAMANHOS.espaco },
  vazio: { flex: 1, fontSize: 24, textAlign: 'center', marginTop: 40 },
  item: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: TAMANHOS.alturaBotao,
    borderWidth: 3,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemAbrir: { flex: 1, padding: 14, justifyContent: 'center' },
  itemTitulo: { fontSize: 24, fontWeight: 'bold' },
  itemData: { fontSize: 20, marginTop: 4 },
  botaoApagar: { width: 110, borderLeftWidth: 3, justifyContent: 'center', alignItems: 'center' },
  textoApagar: { fontSize: 20, fontWeight: 'bold' },
});
