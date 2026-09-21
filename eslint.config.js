const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // `public/ocr` es el motor de OCR copiado tal cual: código de terceros
    // que no se edita a mano y no tiene por qué pasar nuestras reglas.
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-native/**',
      '.expo/**',
      'coverage/**',
      'supabase/.tmp/**',
      'public/ocr/**',
    ],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
    },
  },
];
