// Endereço do servidor na sua rede Wi-Fi.
//
// Jeito recomendado: copie o arquivo .env.example para .env e coloque o IP
// do seu computador lá (cada pessoa do grupo usa o seu, sem mexer no código).
// Se não houver .env, vale o endereço abaixo.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.15:3000';
