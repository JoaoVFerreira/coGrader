import express from 'express';

interface RouteInfo {
  path: string;
  methods: string[];
}

interface ExpressMiddleware {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
  name?: string;
  regexp?: RegExp;
  handle?: {
    stack: ExpressMiddleware[];
  };
}

/**
 * Extracts all registered routes from an Express application
 * @param app - Express application instance
 * @returns Array of routes with their paths and HTTP methods
 */
export const getRoutes = (app: express.Application): RouteInfo[] => {
  const routes: RouteInfo[] = [];

  const extractRoutes = (stack: ExpressMiddleware[], prefix = ''): void => {
    stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods)
          .filter(method => middleware.route?.methods[method])
          .map(method => method.toUpperCase());

        routes.push({
          path: prefix + middleware.route.path,
          methods,
        });
      } else if (middleware.name === 'router' && middleware.handle?.stack) {
        const routerPath = middleware.regexp
          ?.toString()
          .replace('/^\\', '')
          .replace('\\/?(?=\\/|$)/i', '')
          .replace(/\\\//g, '/')
          .replace(/\?\(\?\=/g, '')
          .replace(/\|/g, '')
          .replace(/\$/g, '')
          .replace(/\//g, '') || '';

        let path = prefix;
        if (routerPath && routerPath !== '' && routerPath !== '^') {
          path = prefix + '/' + routerPath;
        }

        extractRoutes(middleware.handle.stack, path);
      }
    });
  };

  extractRoutes(app._router.stack);
  return routes;
};
