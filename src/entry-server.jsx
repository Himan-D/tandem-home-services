import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { DataProvider } from './context/DataContext';
import App from './App';

export function render(url, initialData = {}, user = null) {
  const helmetContext = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <DataProvider data={initialData}>
        <StaticRouter location={url}>
          <App userFromSSR={user} />
        </StaticRouter>
      </DataProvider>
    </HelmetProvider>
  );
  const { helmet } = helmetContext;
  return { html, helmet, data: initialData, user };
}
