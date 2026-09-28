import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import { TAMANHOS } from '../theme';
import { listarLeituras } from '../db';

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoricoScreen({ tema, aoAbrirLeitura, aoVoltar }) {
  const [leituras] = useState(() => listarLeituras());

  const renderItem = useCallback(
    ({ item }) => {
      const resumo = item.texto.split('\n')[0].slice(0, 60);
      return (
        <Pressable
          onPress={() => aoAbrirLeitura(item)}
          accessibilityRole="button"
          accessibilityLabel={`${resumo}. Lido em ${formatarData(item.criado_em)}`}
          accessibilityHint="Abre esta leitura"
          style={[estilos.item, { borderColor: tema.borda }]}
        >
          <Text style={[estilos.itemTitulo, { color: tema.texto }]} numberOfLines={2}>{resumo}</Text>
          <Text style={[estilos.itemData, { color: tema.texto }]}>{formatarData(item.criado_em)}</Text>
        </Pressable>
      );
    },
    [tema, aoAbrirLeitura]
  );

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
  item: { minHeight: TAMANHOS.alturaBotao, borderWidth: 3, borderRadius: 12, padding: 14, marginBottom: 12 },
  itemTitulo: { fontSize: 24, fontWeight: 'bold' },
  itemData: { fontSize: 20, marginTop: 4 },
});
