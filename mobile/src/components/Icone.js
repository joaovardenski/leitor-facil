import { View } from 'react-native';

/**
 * Ícones simples desenhados com View, sem biblioteca extra.
 * São só decoração: o texto ao lado é o que o leitor de tela lê,
 * por isso ficam escondidos da acessibilidade.
 *
 * nome: 'camera' | 'galeria' | 'relogio' | 'contraste' | 'som' | 'parar' | 'voltar'
 */
export default function Icone({ nome, cor, tamanho = 32 }) {
  const s = tamanho;
  const t = Math.max(3, Math.round(s * 0.1)); // espessura do traço
  const Desenho = DESENHOS[nome];
  if (!Desenho) return null;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}
    >
      <Desenho s={s} t={t} c={cor} />
    </View>
  );
}

const DESENHOS = {
  camera: ({ s, t, c }) => (
    <View style={{ width: s, height: s * 0.8, justifyContent: 'flex-end' }}>
      {/* visor em cima */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: s * 0.3,
          width: s * 0.4,
          height: s * 0.22,
          backgroundColor: c,
          borderTopLeftRadius: s * 0.06,
          borderTopRightRadius: s * 0.06,
        }}
      />
      {/* corpo com a lente */}
      <View
        style={{
          height: s * 0.66,
          borderWidth: t,
          borderColor: c,
          borderRadius: s * 0.14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: s * 0.32, height: s * 0.32, borderRadius: s * 0.16, borderWidth: t, borderColor: c }} />
      </View>
    </View>
  ),

  galeria: ({ s, t, c }) => (
    <View style={{ width: s, height: s * 0.8, borderWidth: t, borderColor: c, borderRadius: s * 0.12, overflow: 'hidden' }}>
      {/* sol */}
      <View
        style={{
          position: 'absolute',
          right: s * 0.12,
          top: s * 0.1,
          width: s * 0.2,
          height: s * 0.2,
          borderRadius: s * 0.1,
          backgroundColor: c,
        }}
      />
      {/* montanha: um quadrado girado, cortado pela moldura */}
      <View
        style={{
          position: 'absolute',
          left: s * 0.02,
          bottom: -s * 0.36,
          width: s * 0.56,
          height: s * 0.56,
          backgroundColor: c,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  ),

  relogio: ({ s, t, c }) => {
    const interno = s - 2 * t;
    const meio = interno / 2;
    return (
      <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: t, borderColor: c }}>
        {/* ponteiro dos minutos (para cima) */}
        <View
          style={{
            position: 'absolute',
            left: meio - t / 2,
            top: interno * 0.16,
            width: t,
            height: meio - interno * 0.16 + t / 2,
            backgroundColor: c,
            borderRadius: t / 2,
          }}
        />
        {/* ponteiro das horas (para a direita) */}
        <View
          style={{
            position: 'absolute',
            left: meio - t / 2,
            top: meio - t / 2,
            width: interno * 0.3 + t / 2,
            height: t,
            backgroundColor: c,
            borderRadius: t / 2,
          }}
        />
      </View>
    );
  },

  contraste: ({ s, t, c }) => (
    <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: t, borderColor: c, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (s - 2 * t) / 2, backgroundColor: c }} />
    </View>
  ),

  som: ({ s, t, c }) => (
    <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'center' }}>
      {/* caixa do alto-falante */}
      <View style={{ width: s * 0.2, height: s * 0.34, backgroundColor: c, borderRadius: s * 0.03 }} />
      {/* cone: triângulo feito com bordas */}
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: -s * 0.04,
          borderTopWidth: s * 0.32,
          borderBottomWidth: s * 0.32,
          borderRightWidth: s * 0.3,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: c,
        }}
      />
      {/* onda sonora */}
      <View
        style={{
          width: s * 0.36,
          height: s * 0.56,
          marginLeft: -s * 0.12,
          borderRadius: s * 0.28,
          borderWidth: t,
          borderColor: 'transparent',
          borderRightColor: c,
        }}
      />
    </View>
  ),

  parar: ({ s, c }) => (
    <View style={{ width: s * 0.62, height: s * 0.62, backgroundColor: c, borderRadius: s * 0.08 }} />
  ),

  voltar: ({ s, t, c }) => (
    <View
      style={{
        width: s * 0.46,
        height: s * 0.46,
        marginLeft: s * 0.18,
        borderLeftWidth: t,
        borderBottomWidth: t,
        borderColor: c,
        transform: [{ rotate: '45deg' }],
      }}
    />
  ),
};
