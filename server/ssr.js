const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { prisma } = require('./db');

let template;
let render;

function loadProductionBundle() {
  const distDir = path.resolve(__dirname, '../dist');
  template = fs.readFileSync(path.resolve(distDir, 'index.html'), 'utf-8');
  render = require(path.resolve(distDir, 'server/entry-server.js')).render;
}

const FALLBACK_META = {
  '/': { title: 'Tandem | On-Demand Home Services', description: 'Book trusted, vetted professionals for cleaning, plumbing, AC repair, and more. Transparent pricing, instant booking.' },
  '/login': { title: 'Login | Tandem', description: 'Sign in to your Tandem account to manage bookings and services.' },
  '/signup': { title: 'Sign Up | Tandem', description: 'Create a Tandem account to book home services instantly.' },
  '/forgot-password': { title: 'Forgot Password | Tandem', description: 'Reset your Tandem account password.' },
  '/partner/register': { title: 'Become a Pro | Tandem', description: 'Join Tandem as a service professional and grow your business.' },
};

function getFallbackMeta(url) {
  if (FALLBACK_META[url]) return FALLBACK_META[url];
  const match = url.match(/^\/service\/(.+)/);
  if (match) return { title: `${match[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Services | Tandem`, description: 'Book professional home services on demand with Tandem.' };
  return { title: 'Tandem | On-Demand Home Services', description: 'Book trusted home services on demand.' };
}

function getTokenFromCookie(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function verifyUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

async function fetchSSRData(url) {
  try {
    if (url === '/') {
      const services = await prisma.service.findMany({
        where: { isActive: 1 },
        select: { id: true, title: true, basePrice: true, description: true },
      });
      return { services };
    }

    const match = url.match(/^\/service\/(.+)/);
    if (match) {
      const serviceId = match[1];
      const services = await prisma.service.findMany({
        where: { isActive: 1 },
        select: { id: true, title: true, basePrice: true, description: true },
      });
      const service = services.find(s => s.id === serviceId) || null;
      return { service, services };
    }
  } catch (err) {
    console.error('SSR data fetch error:', err.message);
  }
  return {};
}

function ssrMiddleware(req, res, next) {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/assets/')) return next();
  if (req.path.startsWith('/favicon')) return next();

  if (!template || !render) {
    return res.status(200).set({ 'Content-Type': 'text/html' }).send(template || '<html><body><div id="root"></div></body></html>');
  }

  const respond = (html) => {
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
  };

  (async () => {
    try {
      const token = getTokenFromCookie(req);
      const user = token ? verifyUserFromToken(token) : null;
      const initialData = await fetchSSRData(req.originalUrl);

      const context = {};
      const { html, helmet } = render(req.originalUrl, initialData, user);

      if (context.url) {
        return res.redirect(context.url);
      }

      const helmetTitle = helmet.title && helmet.title.toString();
      const helmetMeta = helmet.meta && helmet.meta.toString();
      const helmetLink = helmet.link && helmet.link.toString();
      const helmetScript = helmet.script && helmet.script.toString();

      const fallback = getFallbackMeta(req.originalUrl);
      const titleTag = helmetTitle || `<title>${fallback.title}</title>`;
      const metaTags = helmetMeta || `<meta name="description" content="${fallback.description}" />`;

      const headTags = [titleTag, metaTags, helmetLink, helmetScript].filter(Boolean).join('\n');

      const dataScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData)}; window.__USER__ = ${JSON.stringify(user)};</script>`;

      let finalHtml = template
        .replace('<!--ssr-outlet-->', html + dataScript)
        .replace('</head>', `${headTags}\n</head>`);

      respond(finalHtml);
    } catch (err) {
      console.error('SSR render error:', err);
      const fallback = getFallbackMeta(req.originalUrl);
      let fallbackHtml = template.replace('<!--ssr-outlet-->', '');
      fallbackHtml = fallbackHtml.replace('</head>', `<title>${fallback.title}</title>\n<meta name="description" content="${fallback.description}" />\n</head>`);
      respond(fallbackHtml);
    }
  })();
}

module.exports = { ssrMiddleware, loadProductionBundle };
