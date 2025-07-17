/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Explicitly set empty options to ensure it loads correctly
    },
  },
};

export default config;
