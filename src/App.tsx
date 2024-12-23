import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import useTheme from './globalState/theme'
import { ThemeState } from './components/templates/NavBar'
import { BrowserRouter } from 'react-router-dom';
import Router from './router';
import FluidCursor from './components/FluidCursor';


function App() {
  const theme = useTheme((state) => (state as ThemeState).theme);
  console.log(theme);
  return (
    <MantineProvider theme={{ colorScheme: theme }} withNormalizeCSS withGlobalStyles >
      
      <Notifications />
      <FluidCursor />
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </MantineProvider>
  )
}

export default App
