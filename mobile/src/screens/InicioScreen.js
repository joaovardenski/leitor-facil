import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import BotaoGrande from '../components/BotaoGrande';
import Carregando from '../components/Carregando';
import Icone from '../components/Icone';
import { TAMANHOS } from '../theme';
import { API_URL } from '../config';

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
  const { width } = useWindowDimensions();

  if (carregando) return <Carregando tema={tema} />;

  // O botão de foto ocupa boa parte da largura da tela, até um limite
  const disparador = Math.min(width * 0.58, 230);

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: tema.texto }]}>
        Leitor Fácil
      </Text>
      <Text style={[estilos.subtitulo, { color: tema.textoSuave }]}>
        Fotografe um papel para ver em letra grande e ouvir.
      </Text>

      {servidorOk === false ? (
        <View style={[estilos.alerta, { borderColor: tema.borda }]} accessibilityLiveRegion="polite">
          <Text style={[estilos.textoAlerta, { color: tema.texto }]}>
            O serviço de leitura não está respondendo. Verifique a internet.
          </Text>
          {/* Ajuda a quem está configurando: mostra o endereço que o app está usando */}
          <Text style={[estilos.endereco, { color: tema.textoSuave }]} selectable>
            Endereço: {API_URL}
          </Text>
          <BotaoGrande tema={tema} secundario rotulo="Tentar de novo" dica="Verifica a conexão outra vez" aoTocar={aoTentarServidor} />
        </View>
      ) : null}

      {erro ? (
        <View style={[estilos.alerta, { borderColor: tema.borda }]}>
          <Text accessibilityLiveRegion="assertive" style={[estilos.textoAlerta, { color: tema.texto, marginBottom: 0 }]}>
            {erro}
          </Text>
        </View>
      ) : null}

      {/* A ação principal: um disparador de câmera gigante */}
      <View style={estilos.areaDisparador}>
        <Pressable
          onPress={aoTirarFoto}
          accessibilityRole="button"
          accessibilityLabel="Tirar foto"
          accessibilityHint="Abre a câmera para fotografar o papel"
          style={({ pressed }) => [
            estilos.anel,
            {
              width: disparador,
              height: disparador,
              borderRadius: disparador / 2,
              borderColor: tema.borda,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          {({ pressed }) => (
            <View
              style={[
                estilos.miolo,
                { borderRadius: disparador / 2, backgroundColor: tema.botaoFundo, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Icone nome="camera" cor={tema.botaoTexto} tamanho={Math.round(disparador * 0.3)} />
              <Text maxFontSizeMultiplier={1.3} style={[estilos.textoDisparador, { color: tema.botaoTexto }]}>
                Tirar foto
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={estilos.opcoes}>
        <BotaoGrande
          tema={tema}
          secundario
          linha
          icone="galeria"
          rotulo="Usar foto salva"
          dica="Abre suas fotos salvas"
          aoTocar={aoEscolherGaleria}
        />
        <BotaoGrande
          tema={tema}
          secundario
          linha
          icone="relogio"
          rotulo="Leituras anteriores"
          dica="Mostra os últimos papéis lidos"
          aoTocar={aoAbrirHistorico}
        />
        <BotaoGrande
          tema={tema}
          secundario
          linha
          icone="contraste"
          rotulo="Cores"
          detalhe={tema.nome}
          dica="Troca as cores da tela"
          aoTocar={aoTrocarTema}
        />
      </View>

      <Text style={[estilos.dica, { color: tema.textoSuave }]}>
        Para ler melhor: papel reto, bastante luz e o texto ocupando a tela.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flexGrow: 1, padding: TAMANHOS.espaco * 1.5, paddingTop: TAMANHOS.espaco * 1.5 },
  titulo: { fontSize: TAMANHOS.fonteTitulo + 6, fontWeight: 'bold', marginBottom: 6 },
  subtitulo: { fontSize: 21, lineHeight: 29, marginBottom: 20 },
  alerta: { borderWidth: TAMANHOS.borda, borderRadius: TAMANHOS.raio, padding: 16, marginBottom: 16, gap: 12 },
  textoAlerta: { fontSize: 22, fontWeight: 'bold', lineHeight: 30 },
  endereco: { fontSize: 16 },
  areaDisparador: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, flexGrow: 1 },
  anel: { borderWidth: 5, padding: 8 },
  miolo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  textoDisparador: { fontSize: 30, fontWeight: 'bold' },
  opcoes: { gap: 12, marginTop: 8 },
  dica: { fontSize: 19, lineHeight: 27, marginTop: 16 },
});
