export const useDarkMode = () => {
  const colorMode = useColorMode();
  
  const isDark = computed({
    get: () => colorMode.preference === 'dark',
    set: (value) => {
      colorMode.preference = value ? 'dark' : 'light';
    }
  });

  const toggleDark = () => {
    colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark';
  };

  return {
    isDark,
    toggleDark,
  };
};