import { create } from 'zustand';
import { ThemeState } from '../components/templates/NavBar';


const initialTheme = localStorage.getItem('theme');

const useTheme = create((set) => ({
  theme: initialTheme || 'light',
  setDarkMode: () =>
    set(() => ({
      theme: 'dark',
    })),
  setLightMode: () =>
    set(() => ({
      theme: 'light',
    })),
}));

useTheme.subscribe((newState) => {
  console.log('Anil Tiwari:', (newState as ThemeState).theme);
  localStorage.setItem('theme', (newState as ThemeState).theme);
});

export default useTheme;